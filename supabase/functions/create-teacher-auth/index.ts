import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTeacherAuthRequest {
  teacher_id: string;
  email: string;
  name: string;
  phone?: string;
}

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
    
    // Create regular client to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !currentUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if current user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only admins can perform this action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateTeacherAuthRequest = await req.json();
    console.log('Creating auth for existing teacher:', body.email);

    // Validate required fields
    if (!body.teacher_id || !body.email || !body.name) {
      return new Response(
        JSON.stringify({ error: 'teacher_id, email, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === body.email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password
    const tempPassword = generateSecurePassword();

    // Create auth user
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: body.name,
        role: 'teacher',
        teacher_id: body.teacher_id,
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
        teacher_id: body.teacher_id,
        phone: body.phone || null,
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

    // Log audit action
    await supabaseAdmin.from('audit_logs').insert({
      action: 'teacher_auth_created',
      performed_by: currentUser.id,
      target_user: authUser.user.id,
      details: {
        teacher_id: body.teacher_id,
        name: body.name,
        email: body.email,
      },
    });

    console.log('Teacher auth created successfully for:', body.teacher_id);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        email: body.email,
        temp_password: tempPassword,
        message: `Login created for ${body.name}. Email: ${body.email}, Temporary Password: ${tempPassword}`,
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
