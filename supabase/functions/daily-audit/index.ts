import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const issues: string[] = [];

    // 1. Check for invalid statuses in scheduled_lessons
    const { data: invalidLessons } = await supabase
      .from('scheduled_lessons')
      .select('scheduled_lesson_id, status, student_id')
      .not('status', 'in', '("scheduled","completed","absent")');
    
    if (invalidLessons && invalidLessons.length > 0) {
      issues.push(`Found ${invalidLessons.length} lessons with invalid statuses: ${[...new Set(invalidLessons.map(l => l.status))].join(', ')}`);
    }

    // 2. Check for invalid statuses in trial_lessons_log
    const { data: invalidTrials } = await supabase
      .from('trial_lessons_log')
      .select('trial_lesson_id, status')
      .not('status', 'in', '("scheduled","completed","absent")');
    
    if (invalidTrials && invalidTrials.length > 0) {
      issues.push(`Found ${invalidTrials.length} trial lessons with invalid statuses`);
    }

    // 3. Check for duplicate scheduled lessons (same student + date + time)
    const { data: allScheduled } = await supabase
      .from('scheduled_lessons')
      .select('scheduled_lesson_id, student_id, scheduled_date, scheduled_time')
      .eq('status', 'scheduled');

    if (allScheduled) {
      const seen = new Map<string, string>();
      const duplicates: string[] = [];
      for (const lesson of allScheduled) {
        const key = `${lesson.student_id}-${lesson.scheduled_date}-${lesson.scheduled_time}`;
        if (seen.has(key)) {
          duplicates.push(lesson.scheduled_lesson_id);
        } else {
          seen.set(key, lesson.scheduled_lesson_id);
        }
      }
      if (duplicates.length > 0) {
        issues.push(`Found ${duplicates.length} duplicate scheduled lessons for same student+datetime`);
      }
    }

    // 4. Wallet mismatch check: wallet should equal future scheduled lessons count
    // (This is an informational check, not a strict rule due to debt system)
    const { data: students } = await supabase
      .from('students')
      .select('student_id, name, wallet_balance, debt_lessons, status');

    if (students) {
      for (const student of students) {
        // Check wallet is never negative
        if ((student.wallet_balance || 0) < 0) {
          issues.push(`Student "${student.name}" has negative wallet balance: ${student.wallet_balance}`);
        }
        // Check debt is never negative
        if ((student.debt_lessons || 0) < 0) {
          issues.push(`Student "${student.name}" has negative debt_lessons: ${student.debt_lessons}`);
        }
        // Verify status matches wallet/debt thresholds
        const wallet = student.wallet_balance || 0;
        const debt = student.debt_lessons || 0;
        let expectedStatus: string;
        if (wallet >= 3) expectedStatus = 'Active';
        else if (debt >= 2) expectedStatus = 'Blocked';
        else expectedStatus = 'Grace';
        
        if (student.status !== expectedStatus) {
          issues.push(`Student "${student.name}" status mismatch: is "${student.status}", expected "${expectedStatus}" (wallet: ${wallet}, debt: ${debt})`);
        }
      }
    }

    // 5. Trial lessons missing teacher assignment
    const { data: unassignedTrials } = await supabase
      .from('trial_lessons_log')
      .select('trial_lesson_id, trial_student_id')
      .is('teacher_id', null);
    
    if (unassignedTrials && unassignedTrials.length > 0) {
      issues.push(`Found ${unassignedTrials.length} trial lessons without teacher assignment`);
    }

    // Log issues as audit_logs if any found
    if (issues.length > 0) {
      await supabase.from('audit_logs').insert({
        action: 'daily_audit',
        details: { issues, timestamp: new Date().toISOString(), issue_count: issues.length },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        issues_found: issues.length,
        issues,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
