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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const eventType = body.type;
    const charge = body.data;

    if (!charge || !charge.id) {
      throw new Error('Invalid webhook payload');
    }

    const pagarmeTransactionId = charge.id;
    const userId = charge.metadata?.user_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('pagarme_transaction_id', pagarmeTransactionId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let newStatus = transaction.status;
    let paidAt = transaction.paid_at;

    switch (eventType) {
      case 'charge.paid':
      case 'order.paid':
        newStatus = 'paid';
        paidAt = new Date().toISOString();
        break;
      case 'charge.pending':
      case 'order.pending':
        newStatus = 'pending';
        break;
      case 'charge.failed':
      case 'order.payment_failed':
        newStatus = 'failed';
        break;
      case 'charge.refunded':
      case 'order.refunded':
        newStatus = 'refunded';
        break;
      case 'charge.chargeback':
        newStatus = 'refunded';

        const { error: disputeError } = await supabase
          .from('disputes')
          .insert({
            user_id: userId,
            transaction_id: transaction.id,
            type: 'chargeback',
            reason: charge.last_transaction?.acquirer_return_code || 'Chargeback iniciado',
            amount: transaction.amount,
            status: 'open',
          });

        if (disputeError) {
          // Erro silencioso - disputa não foi criada mas webhook continua
        }
        break;
      default:
        return new Response(JSON.stringify({ message: 'Event type not handled' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        paid_at: paidAt,
      })
      .eq('id', transaction.id);

    if (updateError) {
      throw updateError;
    }

    if (newStatus === 'paid' && transaction.status !== 'paid') {
      const fee = parseFloat(transaction.fee);
      const netAmount = parseFloat(transaction.net_amount);

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (!walletError && wallet) {
        await supabase
          .from('wallets')
          .update({
            available_balance: parseFloat(wallet.available_balance) + netAmount
          })
          .eq('user_id', userId);
      }

      const depositId = charge.metadata?.deposit_id;
      if (depositId) {
        await supabase
          .from('deposits')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', depositId);
      }
    }

    return new Response(JSON.stringify({
      message: 'Webhook processed successfully',
      transaction_id: transaction.id,
      new_status: newStatus,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
