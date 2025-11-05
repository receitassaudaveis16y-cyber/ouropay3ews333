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

    const adminEmail = 'anapaulamagioli899@gmail.com';
    const adminPassword = 'P20071616l.';

    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === adminEmail);

    let userId: string;

    if (userExists) {
      userId = userExists.id;
      console.log('User already exists:', adminEmail);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        throw new Error('User creation failed');
      }

      userId = newUser.user.id;
      console.log('User created:', adminEmail);
    }

    const { data: existingRole } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      const { error: updateError } = await supabase
        .from('admin_roles')
        .update({
          role: 'super_admin',
          permissions: ['all'],
          is_active: true,
          created_by: userId,
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to update admin role: ${updateError.message}`);
      }

      console.log('Admin role updated for user:', adminEmail);
    } else {
      const { error: insertError } = await supabase
        .from('admin_roles')
        .insert({
          user_id: userId,
          role: 'super_admin',
          permissions: ['all'],
          is_active: true,
          created_by: userId,
        });

      if (insertError) {
        throw new Error(`Failed to create admin role: ${insertError.message}`);
      }

      console.log('Admin role created for user:', adminEmail);
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wallet) {
      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          available_balance: 0,
          pending_balance: 0,
          total_withdrawn: 0,
        });

      if (walletError) {
        console.warn('Failed to create wallet:', walletError.message);
      } else {
        console.log('Wallet created for user:', adminEmail);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Super admin user created/updated successfully',
      email: adminEmail,
      user_id: userId,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('Create admin user error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
