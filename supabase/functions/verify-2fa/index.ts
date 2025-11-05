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

    const body = await req.json();
    const { code, action } = body;

    if (!code) {
      throw new Error('Code is required');
    }

    const { data: mfaSettings, error: fetchError } = await supabase
      .from('user_mfa_settings')
      .select('secret, backup_codes, is_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError || !mfaSettings) {
      throw new Error('2FA not configured for this user');
    }

    let isValid = false;

    if (mfaSettings.secret && verifyTOTP(code, mfaSettings.secret)) {
      isValid = true;
    } else if (mfaSettings.backup_codes && Array.isArray(mfaSettings.backup_codes)) {
      const backupCodes = mfaSettings.backup_codes as string[];
      const codeIndex = backupCodes.indexOf(code);

      if (codeIndex !== -1) {
        isValid = true;

        const updatedCodes = backupCodes.filter((_, index) => index !== codeIndex);

        await supabase
          .from('user_mfa_settings')
          .update({ backup_codes: updatedCodes })
          .eq('user_id', user.id);
      }
    }

    if (!isValid) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Invalid code'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    if (action === 'enable') {
      await supabase
        .from('user_mfa_settings')
        .update({ is_enabled: true })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        valid: true,
        message: '2FA enabled successfully'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      message: 'Code verified successfully'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      valid: false,
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

function verifyTOTP(token: string, secret: string): boolean {
  const time = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const window = 1;

  for (let i = -window; i <= window; i++) {
    const timeSlice = Math.floor(time / timeStep) + i;
    const generatedToken = generateTOTP(secret, timeSlice);

    if (generatedToken === token) {
      return true;
    }
  }

  return false;
}

function generateTOTP(secret: string, timeSlice: number): string {
  const key = base32Decode(secret);
  const time = new Uint8Array(8);
  const view = new DataView(time.buffer);
  view.setBigUint64(0, BigInt(timeSlice), false);

  const hmac = hmacSha1(key, time);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanedBase32 = base32.replace(/=+$/, '').toUpperCase();

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanedBase32.length; i++) {
    const char = cleanedBase32[i];
    const index = alphabet.indexOf(char);

    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let keyArray = key;

  if (keyArray.length > blockSize) {
    keyArray = sha1(keyArray);
  }

  if (keyArray.length < blockSize) {
    const newKey = new Uint8Array(blockSize);
    newKey.set(keyArray);
    keyArray = newKey;
  }

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyArray[i] ^ 0x36;
    opad[i] = keyArray[i] ^ 0x5c;
  }

  const innerHash = sha1(concat(ipad, message));
  return sha1(concat(opad, innerHash));
}

function sha1(data: Uint8Array): Uint8Array {
  let h0 = 0x67452301;
  let h1 = 0xEFCDAB89;
  let h2 = 0x98BADCFE;
  let h3 = 0x10325476;
  let h4 = 0xC3D2E1F0;

  const paddedData = padSha1(data);

  for (let i = 0; i < paddedData.length; i += 64) {
    const w = new Uint32Array(80);

    for (let j = 0; j < 16; j++) {
      w[j] =
        (paddedData[i + j * 4] << 24) |
        (paddedData[i + j * 4 + 1] << 16) |
        (paddedData[i + j * 4 + 2] << 8) |
        paddedData[i + j * 4 + 3];
    }

    for (let j = 16; j < 80; j++) {
      w[j] = rotateLeft(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;

    for (let j = 0; j < 80; j++) {
      let f, k;

      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5A827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }

      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const result = new Uint8Array(20);
  const view = new DataView(result.buffer);
  view.setUint32(0, h0, false);
  view.setUint32(4, h1, false);
  view.setUint32(8, h2, false);
  view.setUint32(12, h3, false);
  view.setUint32(16, h4, false);

  return result;
}

function padSha1(data: Uint8Array): Uint8Array {
  const bitLength = data.length * 8;
  const paddingLength = (55 - data.length) % 64;
  const totalLength = data.length + paddingLength + 1 + 8;

  const padded = new Uint8Array(totalLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setBigUint64(totalLength - 8, BigInt(bitLength), false);

  return padded;
}

function rotateLeft(n: number, bits: number): number {
  return ((n << bits) | (n >>> (32 - bits))) >>> 0;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}
