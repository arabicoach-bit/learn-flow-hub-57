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
 
     // Find all scheduled lessons for today that haven't been marked (still 'scheduled')
     const { data: unmarkedLessons, error: lessonsError } = await supabase
       .from('scheduled_lessons')
       .select(`
         scheduled_lesson_id,
         teacher_id,
         student_id,
         scheduled_time,
         students(name),
         teachers(name)
       `)
       .eq('scheduled_date', todayUAE)
       .eq('status', 'scheduled');
 
     if (lessonsError) {
       throw lessonsError;
     }
 
     if (!unmarkedLessons || unmarkedLessons.length === 0) {
       return new Response(
         JSON.stringify({ 
           success: true, 
           message: 'No unmarked lessons found for today',
           date: todayUAE 
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Group lessons by teacher
     const lessonsByTeacher = unmarkedLessons.reduce((acc: Record<string, any[]>, lesson: any) => {
       const teacherId = lesson.teacher_id;
       if (!acc[teacherId]) {
         acc[teacherId] = [];
       }
       acc[teacherId].push(lesson);
       return acc;
     }, {});
 
     // Create notifications for each teacher
     const notificationsToCreate = [];
     
     for (const [teacherId, lessons] of Object.entries(lessonsByTeacher)) {
       const lessonList = lessons as any[];
       const teacherName = lessonList[0]?.teachers?.name || 'Teacher';
       const studentNames = lessonList.map((l: any) => l.students?.name).filter(Boolean);
       const lessonCount = lessonList.length;
       
       // Check if we already sent a notification today for this teacher
       const { data: existingNotification } = await supabase
         .from('notifications')
         .select('notification_id')
         .eq('type', 'unmarked_lesson_reminder')
         .eq('related_id', teacherId)
         .gte('created_at', `${todayUAE}T00:00:00`)
         .limit(1);
 
       if (existingNotification && existingNotification.length > 0) {
         continue; // Skip if already notified today
       }
 
       const studentList = studentNames.length <= 3 
         ? studentNames.join(', ') 
         : `${studentNames.slice(0, 3).join(', ')} and ${studentNames.length - 3} more`;
       
       notificationsToCreate.push({
         type: 'unmarked_lesson_reminder',
         related_id: teacherId,
         message: `${teacherName} has ${lessonCount} unmarked lesson${lessonCount > 1 ? 's' : ''} for today: ${studentList}. Please mark them before they expire.`,
         student_name: teacherName,
         wallet_balance: lessonCount,
         is_read: false,
       });
     }
 
     if (notificationsToCreate.length > 0) {
       const { error: insertError } = await supabase
         .from('notifications')
         .insert(notificationsToCreate);
 
       if (insertError) {
         throw insertError;
       }
     }
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         message: `Created ${notificationsToCreate.length} reminder notifications`,
         date: todayUAE,
         teachers_notified: notificationsToCreate.length,
         total_unmarked_lessons: unmarkedLessons.length
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Error checking unmarked lessons:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     return new Response(
      JSON.stringify({ error: errorMessage }),
       { 
         status: 500, 
         headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
       }
     );
   }
 });