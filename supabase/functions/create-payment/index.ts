import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY');

    if (!pagarmeSecretKey) {
      throw new Error('PAGARME_SECRET_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { amount, payment_method, customer, credit_card, description, type, userId, depositId } = body;

    const finalUserId = userId || user.id;
    const amountInCents = Math.round(amount * 100);

    const pagarmePayload: any = {
      amount: amountInCents,
      payment_method: payment_method,
      customer: {
        type: customer.document.length === 11 ? 'individual' : 'corporation',
        name: customer.name,
        email: customer.email,
        document: customer.document.replace(/\D/g, ''),
        document_type: customer.document.length === 11 ? 'cpf' : 'cnpj',
      },
      metadata: {
        user_id: finalUserId,
        type: type || 'payment',
        deposit_id: depositId || null,
      }
    };

    if (customer.phone) {
      pagarmePayload.customer.phones = {
        mobile_phone: {
          country_code: '55',
          area_code: customer.phone.slice(0, 2),
          number: customer.phone.slice(2),
        }
      };
    }

    if (payment_method === 'credit_card' && credit_card) {
      pagarmePayload.card = {
        number: credit_card.card_number.replace(/\s/g, ''),
        holder_name: credit_card.card_holder_name,
        exp_month: credit_card.card_expiration_date.slice(0, 2),
        exp_year: '20' + credit_card.card_expiration_date.slice(2, 4),
        cvv: credit_card.card_cvv,
      };
      pagarmePayload.billing = {
        name: customer.name,
        address: {
          country: 'BR',
          state: 'SP',
          city: 'São Paulo',
          zip_code: '01310100',
          line_1: 'Av. Paulista, 1000',
        }
      };
    }

    const pagarmeResponse = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(pagarmeSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          amount: amountInCents,
          description: description || 'Pagamento',
          quantity: 1,
        }],
        payments: [pagarmePayload],
        customer: pagarmePayload.customer,
      }),
    });

    const pagarmeData = await pagarmeResponse.json();

    if (!pagarmeResponse.ok) {
      throw new Error(pagarmeData.message || 'Erro ao processar pagamento');
    }

    const charge = pagarmeData.charges?.[0];
    const transactionStatus = charge?.status === 'paid' ? 'paid' : 'pending';

    const fee = amountInCents * 0.0399;
    const netAmount = amountInCents - fee;

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: finalUserId,
        amount: amount,
        fee: fee / 100,
        net_amount: netAmount / 100,
        payment_method: payment_method,
        status: transactionStatus,
        description: description || 'Pagamento',
        customer_name: customer.name,
        customer_email: customer.email,
        pagarme_transaction_id: charge?.id,
        paid_at: charge?.status === 'paid' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error('Erro ao registrar transação');
    }

    if (depositId && transactionStatus === 'paid') {
      await supabase
        .from('deposits')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', depositId);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', finalUserId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            available_balance: parseFloat(wallet.available_balance) + (netAmount / 100)
          })
          .eq('user_id', finalUserId);
      }
    }

    const responseData: any = {
      transaction_id: transaction.id,
      status: transactionStatus,
      amount: amount,
    };

    if (payment_method === 'pix' && charge?.last_transaction) {
      responseData.pix = {
        qr_code: charge.last_transaction.qr_code,
        qr_code_url: charge.last_transaction.qr_code_url,
      };
    } else if (payment_method === 'boleto' && charge?.last_transaction) {
      responseData.boleto = {
        pdf: charge.last_transaction.pdf,
        barcode: charge.last_transaction.line,
      };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
