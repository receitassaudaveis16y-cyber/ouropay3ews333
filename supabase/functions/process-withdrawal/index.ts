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

    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!adminRole) {
      throw new Error('Admin access required');
    }

    const body = await req.json();
    const { withdrawal_id, action } = body;

    if (!withdrawal_id || !action) {
      throw new Error('withdrawal_id and action are required');
    }

    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*, wallets(*)')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        throw new Error('Only pending withdrawals can be approved');
      }

      await supabase
        .from('withdrawals')
        .update({
          status: 'processing',
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal_id);

      const amountInCents = Math.round(parseFloat(withdrawal.amount) * 100);

      let transferPayload: any = {
        amount: amountInCents,
        metadata: {
          withdrawal_id: withdrawal_id,
          user_id: withdrawal.user_id,
        }
      };

      if (withdrawal.pix_key) {
        transferPayload = {
          ...transferPayload,
          type: 'pix',
          pix_key: withdrawal.pix_key,
          pix_key_type: withdrawal.pix_key_type,
        };
      } else {
        transferPayload = {
          ...transferPayload,
          type: 'bank_transfer',
          bank_account: {
            bank_code: getBankCode(withdrawal.bank_name),
            account_number: withdrawal.account_number,
            account_type: withdrawal.account_type === 'checking' ? 'conta_corrente' : 'conta_poupanca',
          }
        };
      }

      const pagarmeResponse = await fetch('https://api.pagar.me/core/v5/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(pagarmeSecretKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferPayload),
      });

      const pagarmeData = await pagarmeResponse.json();

      if (!pagarmeResponse.ok) {
        console.error('Pagar.me transfer error:', pagarmeData);

        await supabase
          .from('withdrawals')
          .update({
            status: 'failed',
            rejection_reason: pagarmeData.message || 'Erro ao processar transferência',
          })
          .eq('id', withdrawal_id);

        throw new Error(pagarmeData.message || 'Erro ao processar transferência');
      }

      const transferStatus = pagarmeData.status;

      if (transferStatus === 'paid' || transferStatus === 'processing') {
        await supabase
          .from('withdrawals')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', withdrawal_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Saque processado com sucesso',
          withdrawal_id: withdrawal_id,
          transfer_id: pagarmeData.id,
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } else {
        await supabase
          .from('withdrawals')
          .update({
            status: 'processing',
          })
          .eq('id', withdrawal_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Transferência em processamento',
          withdrawal_id: withdrawal_id,
          transfer_id: pagarmeData.id,
          status: transferStatus,
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

    } else if (action === 'reject') {
      if (withdrawal.status !== 'pending') {
        throw new Error('Only pending withdrawals can be rejected');
      }

      const { rejection_reason } = body;

      if (!rejection_reason) {
        throw new Error('rejection_reason is required');
      }

      await supabase
        .from('withdrawals')
        .update({
          status: 'failed',
          rejection_reason: rejection_reason,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Saque rejeitado com sucesso',
        withdrawal_id: withdrawal_id,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } else {
      throw new Error('Invalid action. Must be "approve" or "reject"');
    }

  } catch (error: any) {
    console.error('Process withdrawal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

function getBankCode(bankName: string): string {
  const bankCodes: { [key: string]: string } = {
    'banco do brasil': '001',
    'bradesco': '237',
    'caixa': '104',
    'itau': '341',
    'santander': '033',
    'nubank': '260',
    'inter': '077',
    'banco original': '212',
    'banrisul': '041',
    'sicredi': '748',
  };

  const normalized = bankName.toLowerCase().trim();

  for (const [key, code] of Object.entries(bankCodes)) {
    if (normalized.includes(key)) {
      return code;
    }
  }

  return '000';
}
