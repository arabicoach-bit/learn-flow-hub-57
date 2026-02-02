import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch CRM data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current CRM data for context
    const [
      { data: students },
      { data: leads },
      { data: trialStudents },
      { data: teachers },
      { data: packages },
      { data: notifications },
    ] = await Promise.all([
      supabase.from('students').select('student_id, name, status, wallet_balance, teacher_id').limit(100),
      supabase.from('leads').select('*').limit(50),
      supabase.from('trial_students').select('*').limit(50),
      supabase.from('teachers').select('teacher_id, name, is_active').eq('is_active', true),
      supabase.from('packages').select('package_id, student_id, status, lessons_purchased, lessons_used').eq('status', 'Active').limit(50),
      supabase.from('notifications').select('*').eq('is_read', false).limit(20),
    ]);

    // Calculate stats
    const activeStudents = students?.filter(s => s.status === 'Active').length || 0;
    const graceStudents = students?.filter(s => s.status === 'Grace').length || 0;
    const blockedStudents = students?.filter(s => s.status === 'Blocked').length || 0;
    const totalStudents = students?.length || 0;
    
    const newLeads = leads?.filter(l => l.status === 'New').length || 0;
    const contactedLeads = leads?.filter(l => l.status === 'Contacted').length || 0;
    const interestedLeads = leads?.filter(l => l.status === 'Interested').length || 0;
    
    const scheduledTrials = trialStudents?.filter(t => t.status === 'Scheduled').length || 0;
    const completedTrials = trialStudents?.filter(t => t.status === 'Completed').length || 0;
    const convertedTrials = trialStudents?.filter(t => t.status === 'Converted').length || 0;
    
    const lowBalanceStudents = students?.filter(s => s.wallet_balance !== undefined && s.wallet_balance <= 2) || [];
    const unreadNotifications = notifications?.length || 0;

    const systemPrompt = `You are an AI assistant for an educational academy CRM system. You help administrators understand and manage their student data, leads, trial students, and teacher assignments.

Current CRM Summary:
- Total Students: ${totalStudents}
  • Active: ${activeStudents}
  • Grace Period: ${graceStudents}
  • Blocked: ${blockedStudents}
  
- Leads Pipeline:
  • New: ${newLeads}
  • Contacted: ${contactedLeads}
  • Interested: ${interestedLeads}
  • Total Leads: ${leads?.length || 0}
  
- Trial Students:
  • Scheduled: ${scheduledTrials}
  • Completed: ${completedTrials}
  • Converted: ${convertedTrials}
  
- Teachers: ${teachers?.length || 0} active teachers

- Urgent Attention Needed:
  • ${lowBalanceStudents.length} students with low wallet balance (≤2 lessons)
  • ${unreadNotifications} unread notifications
  • ${blockedStudents} blocked students needing payment

Recent Leads Data:
${leads?.slice(0, 10).map(l => `- ${l.name}: ${l.status} (Source: ${l.source || 'Unknown'}, Interest: ${l.interest || 'Not specified'})`).join('\n') || 'No leads data'}

Students Needing Attention:
${lowBalanceStudents.slice(0, 10).map(s => `- ${s.name}: Wallet balance ${s.wallet_balance}, Status: ${s.status}`).join('\n') || 'No students with low balance'}

Trial Students Pipeline:
${trialStudents?.slice(0, 10).map(t => `- ${t.name}: ${t.status} (Result: ${t.trial_result || 'Pending'})`).join('\n') || 'No trial students'}

Instructions:
- Be concise and helpful
- Provide actionable insights
- Highlight urgent items that need attention
- Answer questions about the CRM data
- Suggest next steps when appropriate
- Use bullet points for clarity
- If asked about specific data you don't have, explain what information is available`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("CRM Assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
