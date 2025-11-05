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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    if (req.method === 'GET') {
      const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        is_enabled: mfaSettings?.is_enabled || false,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'enable') {
      const secret = generateSecret();
      const qrCodeUrl = generateQRCodeUrl(user.email!, secret);
      const backupCodes = generateBackupCodes();

      const { error: insertError } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: user.id,
          secret: secret,
          backup_codes: backupCodes,
          is_enabled: false,
        });

      if (insertError) {
        throw new Error('Failed to setup 2FA');
      }

      return new Response(JSON.stringify({
        secret: secret,
        qrCodeUrl: qrCodeUrl,
        backupCodes: backupCodes,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    if (action === 'disable') {
      const { error: deleteError } = await supabase
        .from('user_mfa_settings')
        .update({ is_enabled: false, secret: null, backup_codes: null })
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to disable 2FA');
      }

      return new Response(JSON.stringify({ message: '2FA disabled successfully' }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
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

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function generateQRCodeUrl(email: string, secret: string): string {
  const issuer = 'GoldsPay';
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  return otpauthUrl;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    codes.push(code.match(/.{1,4}/g)!.join('-'));
  }
  return codes;
}
