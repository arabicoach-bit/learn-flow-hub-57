import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !currentUser) {
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
      return new Response(
        JSON.stringify({ error: 'Only admins can perform this action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const action = req.headers.get('x-action') || 'create';

    if (action === 'create') {
      const body = await req.json();
      const { name, email } = body;
      const normalizedEmail = (email || '').trim().toLowerCase();

      if (!name || !normalizedEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Name and email are required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if email already exists
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'An account with this email already exists' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tempPassword = generateSecurePassword();

      // Create auth user
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: name, role: 'admin' },
      });

      if (authUserError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create admin user: ' + authUserError.message }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update profile
      await supabaseAdmin
        .from('profiles')
        .update({
          temp_password: tempPassword,
          invitation_sent_at: new Date().toISOString(),
        })
        .eq('id', authUser.user.id);

      // Add admin role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: authUser.user.id, role: 'admin' });

      if (roleInsertError) {
        console.error('Role insert error:', roleInsertError);
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        action: 'admin_created',
        performed_by: currentUser.id,
        target_user: authUser.user.id,
        admin_name: currentUser.user_metadata?.full_name || currentUser.email,
        entity_type: 'admin',
        entity_id: authUser.user.id,
        details: { name, email: normalizedEmail },
      });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: authUser.user.id,
          temp_password: tempPassword,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // List all admin users
      const { data: adminRoles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminIds = (adminRoles || []).map(r => r.user_id);

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, last_login, created_at, is_active')
        .in('id', adminIds);

      return new Response(
        JSON.stringify({ success: true, admins: profiles || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const body = await req.json();
      const { user_id } = body;

      if (user_id === currentUser.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete auth user (cascades to profiles)
      await supabaseAdmin.auth.admin.deleteUser(user_id);

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        action: 'admin_deleted',
        performed_by: currentUser.id,
        admin_name: currentUser.user_metadata?.full_name || currentUser.email,
        entity_type: 'admin',
        entity_id: user_id,
        details: { deleted_user_id: user_id },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset-password') {
      const body = await req.json();
      const { user_id } = body;
      const tempPassword = generateSecurePassword();

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password: tempPassword }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to reset password: ' + updateError.message }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin
        .from('profiles')
        .update({ temp_password: tempPassword, password_changed_at: null })
        .eq('id', user_id);

      await supabaseAdmin.from('audit_logs').insert({
        action: 'admin_password_reset',
        performed_by: currentUser.id,
        target_user: user_id,
        admin_name: currentUser.user_metadata?.full_name || currentUser.email,
        entity_type: 'admin',
      });

      return new Response(
        JSON.stringify({ success: true, temp_password: tempPassword }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
