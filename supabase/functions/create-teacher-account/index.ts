import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTeacherRequest {
  name: string;
  email: string;
  phone?: string;
  rate_per_lesson: number;
  class_ids?: string[];
}

interface ResetPasswordRequest {
  teacher_id: string;
  user_id: string;
  email: string;
  name: string;
}

interface ToggleActiveRequest {
  teacher_id: string;
  user_id: string;
  is_active: boolean;
}

interface DeleteTeacherRequest {
  teacher_id: string;
  user_id: string;
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

    const url = new URL(req.url);
    const action = req.headers.get('x-action') || url.searchParams.get('action') || 'create';

    if (action === 'create') {
      const body: CreateTeacherRequest = await req.json();
      console.log('Creating teacher:', body.email);

      // Validate required fields
      if (!body.name || !body.email || body.rate_per_lesson === undefined) {
        return new Response(
          JSON.stringify({ error: 'Name, email, and rate_per_lesson are required' }),
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

      // 1. Create teacher record first
      const { data: teacher, error: teacherError } = await supabaseAdmin
        .from('teachers')
        .insert({
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          rate_per_lesson: body.rate_per_lesson,
          is_active: true,
        })
        .select()
        .single();

      if (teacherError) {
        console.error('Teacher creation error:', teacherError);
        return new Response(
          JSON.stringify({ error: 'Failed to create teacher record: ' + teacherError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Create auth user
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: body.name,
          role: 'teacher',
          teacher_id: teacher.teacher_id,
        },
      });

      if (authUserError) {
        console.error('Auth user creation error:', authUserError);
        // Rollback: delete teacher record
        await supabaseAdmin.from('teachers').delete().eq('teacher_id', teacher.teacher_id);
        return new Response(
          JSON.stringify({ error: 'Failed to create auth user: ' + authUserError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Update profile with teacher_id and invitation info
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          teacher_id: teacher.teacher_id,
          phone: body.phone || null,
          temp_password: tempPassword,
          invitation_sent_at: new Date().toISOString(),
        })
        .eq('id', authUser.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // 4. Add teacher role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: 'teacher',
        });

      if (roleInsertError) {
        console.error('Role insert error:', roleInsertError);
      }

      // 5. Assign classes if provided
      if (body.class_ids && body.class_ids.length > 0) {
        for (const classId of body.class_ids) {
          await supabaseAdmin
            .from('classes')
            .update({ teacher_id: teacher.teacher_id })
            .eq('class_id', classId);
        }
      }

      // 6. Log audit action
      await supabaseAdmin.from('audit_logs').insert({
        action: 'teacher_created',
        performed_by: currentUser.id,
        target_user: authUser.user.id,
        details: {
          teacher_id: teacher.teacher_id,
          name: body.name,
          email: body.email,
        },
      });

      console.log('Teacher created successfully:', teacher.teacher_id);

      return new Response(
        JSON.stringify({
          success: true,
          teacher,
          user_id: authUser.user.id,
          temp_password: tempPassword,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset-password') {
      const body: ResetPasswordRequest = await req.json();
      console.log('Resetting password for teacher:', body.email);

      const tempPassword = generateSecurePassword();

      // Update auth user password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        body.user_id,
        { password: tempPassword }
      );

      if (updateError) {
        console.error('Password reset error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to reset password: ' + updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update profile with new temp password and reset password_changed_at
      await supabaseAdmin
        .from('profiles')
        .update({
          temp_password: tempPassword,
          password_changed_at: null,
        })
        .eq('teacher_id', body.teacher_id);

      // Log audit action
      await supabaseAdmin.from('audit_logs').insert({
        action: 'password_reset',
        performed_by: currentUser.id,
        target_user: body.user_id,
        details: {
          teacher_id: body.teacher_id,
          name: body.name,
        },
      });

      return new Response(
        JSON.stringify({ success: true, temp_password: tempPassword }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'toggle-active') {
      const body: ToggleActiveRequest = await req.json();
      console.log('Toggling active status for teacher:', body.teacher_id);

      // Update teacher is_active
      const { error: teacherError } = await supabaseAdmin
        .from('teachers')
        .update({ is_active: body.is_active })
        .eq('teacher_id', body.teacher_id);

      if (teacherError) {
        console.error('Toggle active error:', teacherError);
        return new Response(
          JSON.stringify({ error: 'Failed to update teacher status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update profile is_active
      await supabaseAdmin
        .from('profiles')
        .update({ is_active: body.is_active })
        .eq('teacher_id', body.teacher_id);

      // Log audit action
      await supabaseAdmin.from('audit_logs').insert({
        action: body.is_active ? 'teacher_activated' : 'teacher_deactivated',
        performed_by: currentUser.id,
        target_user: body.user_id,
        details: { teacher_id: body.teacher_id },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const body: DeleteTeacherRequest = await req.json();
      console.log('Deleting teacher:', body.teacher_id);

      // Check if teacher has lessons
      const { data: lessons } = await supabaseAdmin
        .from('lessons_log')
        .select('lesson_id')
        .eq('teacher_id', body.teacher_id)
        .limit(1);

      if (lessons && lessons.length > 0) {
        // Soft delete - deactivate and anonymize email
        const timestamp = Date.now();
        await supabaseAdmin
          .from('teachers')
          .update({ 
            is_active: false, 
            email: `deleted_${timestamp}@deleted.com` 
          })
          .eq('teacher_id', body.teacher_id);

        // Delete auth user
        await supabaseAdmin.auth.admin.deleteUser(body.user_id);
      } else {
        // Hard delete
        // Unassign from classes first
        await supabaseAdmin
          .from('classes')
          .update({ teacher_id: null })
          .eq('teacher_id', body.teacher_id);

        // Delete teacher record
        await supabaseAdmin
          .from('teachers')
          .delete()
          .eq('teacher_id', body.teacher_id);

        // Delete auth user (this will cascade to profiles via trigger)
        await supabaseAdmin.auth.admin.deleteUser(body.user_id);
      }

      // Log audit action
      await supabaseAdmin.from('audit_logs').insert({
        action: 'teacher_deleted',
        performed_by: currentUser.id,
        details: { teacher_id: body.teacher_id },
      });

      return new Response(
        JSON.stringify({ success: true }),
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