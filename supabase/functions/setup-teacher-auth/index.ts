import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a secure temporary password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get teacher info from request
    const { teacher_id, email, name, phone } = await req.json();

    if (!teacher_id || !email || !name) {
      return new Response(
        JSON.stringify({ error: 'teacher_id, email, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists', existing: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password
    const tempPassword = generateSecurePassword();

    // Create auth user
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'teacher',
        teacher_id: teacher_id,
      },
    });

    if (authUserError) {
      console.error('Auth user creation error:', authUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user: ' + authUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with teacher_id and invitation info
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        teacher_id: teacher_id,
        phone: phone || null,
        temp_password: tempPassword,
        invitation_sent_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // Add teacher role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: 'teacher',
      });

    if (roleInsertError) {
      console.error('Role insert error:', roleInsertError);
    }

    console.log('Teacher auth created successfully for:', teacher_id);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        email: email,
        temp_password: tempPassword,
        message: `Login created for ${name}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
