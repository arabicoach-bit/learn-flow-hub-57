import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get today's date in UAE timezone
    const uaeNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const todayUAE = uaeNow.toISOString().split('T')[0];

    const results = {
      followup_due: 0,
      low_balance: 0,
      expiring_packages: 0,
      daily_summary: false,
    };

    // ===== 1. FOLLOW-UP DUE ALERTS =====
    // Find trial students with overdue follow-ups
    const { data: overdueFollowups } = await supabase
      .from('trial_students')
      .select('trial_id, name, follow_up, next_followup_date:last_contact_date, teacher_id, teachers(name)')
      .in('conversion_status', ['Pending'])
      .not('last_contact_date', 'is', null)
      .lte('last_contact_date', todayUAE);

    if (overdueFollowups && overdueFollowups.length > 0) {
      for (const trial of overdueFollowups) {
        // Check if already notified today
        const { data: existing } = await supabase
          .from('notifications')
          .select('notification_id')
          .eq('type', 'followup_due')
          .eq('related_id', trial.trial_id)
          .gte('created_at', `${todayUAE}T00:00:00`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const teacherName = (trial as any).teachers?.name || 'N/A';

        await supabase.from('notifications').insert({
          type: 'followup_due',
          related_id: trial.trial_id,
          message: `📞 Follow-up due for trial student ${trial.name} | 👨‍🏫 Teacher: ${teacherName} | Last contact: ${trial.last_contact_date || 'N/A'} | Notes: ${trial.follow_up || 'No notes'}`,
          student_name: trial.name,
          wallet_balance: 0,
          is_read: false,
        });
        results.followup_due++;
      }
    }

    // ===== 2. PROACTIVE LOW BALANCE SCAN =====
    // Find active students with wallet_balance <= 2 and no recent low_balance notification
    const { data: lowBalanceStudents } = await supabase
      .from('students')
      .select('student_id, name, wallet_balance, teacher_id, teachers(name)')
      .eq('status', 'Active')
      .lte('wallet_balance', 2)
      .gte('wallet_balance', 0);

    if (lowBalanceStudents && lowBalanceStudents.length > 0) {
      for (const student of lowBalanceStudents) {
        // Check if already notified in last 3 days
        const threeDaysAgo = new Date(uaeNow);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const threeDaysAgoStr = threeDaysAgo.toISOString();

        const { data: existing } = await supabase
          .from('notifications')
          .select('notification_id')
          .eq('type', 'low_balance')
          .eq('related_id', student.student_id)
          .eq('is_read', false)
          .gte('created_at', threeDaysAgoStr)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const teacherName = (student as any).teachers?.name || 'N/A';
        const urgency = student.wallet_balance === 0 ? '🚨 URGENT' : '⚠️';

        await supabase.from('notifications').insert({
          type: student.wallet_balance === 0 ? 'grace_mode' : 'low_balance',
          related_id: student.student_id,
          message: `${urgency} ${student.name} has ${student.wallet_balance} lessons remaining | 👨‍🏫 Teacher: ${teacherName} | Action: Contact parent for renewal`,
          student_name: student.name,
          wallet_balance: student.wallet_balance,
          is_read: false,
        });
        results.low_balance++;
      }
    }

    // ===== 3. EXPIRING PACKAGES (80%+ used) =====
    const { data: nearlyDonePackages } = await supabase
      .from('packages')
      .select('package_id, student_id, lessons_purchased, lessons_used, students(name, teacher_id, teachers(name))')
      .eq('status', 'Active');

    if (nearlyDonePackages && nearlyDonePackages.length > 0) {
      for (const pkg of nearlyDonePackages) {
        const remaining = pkg.lessons_purchased - (pkg.lessons_used || 0);
        const threshold = Math.ceil(pkg.lessons_purchased * 0.2);

        if (remaining > threshold || remaining <= 0) continue;

        // Check if already notified
        const { data: existing } = await supabase
          .from('notifications')
          .select('notification_id')
          .eq('type', 'renewal_due')
          .eq('related_id', pkg.student_id)
          .eq('is_read', false)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const studentName = (pkg as any).students?.name || 'Unknown';
        const teacherName = (pkg as any).students?.teachers?.name || 'N/A';

        await supabase.from('notifications').insert({
          type: 'renewal_due',
          related_id: pkg.student_id,
          message: `📦 Package nearly done for ${studentName} | Only ${remaining} of ${pkg.lessons_purchased} lessons left | 👨‍🏫 Teacher: ${teacherName} | Contact parent for renewal`,
          student_name: studentName,
          wallet_balance: remaining,
          is_read: false,
        });
        results.expiring_packages++;
      }
    }

    // ===== 4. ENHANCED DAILY SUMMARY =====
    // Check if summary already sent today
    const { data: existingSummary } = await supabase
      .from('notifications')
      .select('notification_id')
      .eq('type', 'daily_summary')
      .gte('created_at', `${todayUAE}T00:00:00`)
      .limit(1);

    if (!existingSummary || existingSummary.length === 0) {
      // Gather metrics
      const { count: todayLessons } = await supabase
        .from('scheduled_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', todayUAE);

      const { count: completedLessons } = await supabase
        .from('scheduled_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', todayUAE)
        .eq('status', 'completed');

      const { count: unmarkedLessons } = await supabase
        .from('scheduled_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', todayUAE)
        .eq('status', 'scheduled');

      const { count: todayTrials } = await supabase
        .from('trial_students')
        .select('*', { count: 'exact', head: true })
        .eq('trial_date', todayUAE);

      const { count: lowBalanceCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active')
        .lte('wallet_balance', 2);

      const { count: pendingTrials } = await supabase
        .from('trial_students')
        .select('*', { count: 'exact', head: true })
        .eq('conversion_status', 'Pending');

      const summary = [
        `📊 Daily Summary for ${todayUAE}`,
        `📚 Lessons: ${completedLessons || 0}/${todayLessons || 0} completed`,
        unmarkedLessons ? `⚠️ ${unmarkedLessons} unmarked lessons` : '✅ All lessons marked',
        `🎓 Trials today: ${todayTrials || 0} | Pending conversion: ${pendingTrials || 0}`,
        `💰 Low balance students: ${lowBalanceCount || 0}`,
        results.followup_due > 0 ? `📞 ${results.followup_due} overdue follow-ups` : '',
      ].filter(Boolean).join(' | ');

      await supabase.from('notifications').insert({
        type: 'daily_summary',
        message: summary,
        student_name: 'System',
        wallet_balance: todayLessons || 0,
        is_read: false,
      });
      results.daily_summary = true;
    }

    return new Response(
      JSON.stringify({ success: true, date: todayUAE, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily notification scan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
