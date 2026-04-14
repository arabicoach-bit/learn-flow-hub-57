import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface JourneyNote {
  type: string;
  entity_name: string;
  comment: string;
  author: string;
  date: string;
}

export async function exportJourneyHistory(studentId: string, studentName: string) {
  const notes: JourneyNote[] = [];

  // 1. Check if student was converted from trial
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single();

  // Find trial that converted to this student
  const { data: trial } = await supabase
    .from('trial_students')
    .select('trial_id, lead_id, name')
    .eq('converted_student_id', studentId)
    .maybeSingle();

  // If there's a lead, get lead notes
  if (trial?.lead_id) {
    const { data: leadComments } = await supabase
      .from('lead_comments')
      .select('comment, created_at, profiles(full_name)')
      .eq('lead_id', trial.lead_id)
      .order('created_at', { ascending: true });

    leadComments?.forEach(c => {
      notes.push({
        type: 'Lead',
        entity_name: trial.name || studentName,
        comment: c.comment,
        author: (c.profiles as any)?.full_name || 'System',
        date: c.created_at,
      });
    });
  }

  // Get trial notes
  if (trial?.trial_id) {
    const { data: trialComments } = await supabase
      .from('trial_comments')
      .select('comment, created_at, profiles(full_name)')
      .eq('trial_id', trial.trial_id)
      .order('created_at', { ascending: true });

    trialComments?.forEach(c => {
      notes.push({
        type: 'Trial',
        entity_name: trial.name || studentName,
        comment: c.comment,
        author: (c.profiles as any)?.full_name || 'System',
        date: c.created_at,
      });
    });
  }

  // Get student notes
  const { data: studentComments } = await supabase
    .from('student_comments')
    .select('comment, created_at, profiles(full_name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  studentComments?.forEach(c => {
    notes.push({
      type: 'Student',
      entity_name: studentName,
      comment: c.comment,
      author: (c.profiles as any)?.full_name || 'System',
      date: c.created_at,
    });
  });

  // Get package notes
  const { data: packages } = await supabase
    .from('packages')
    .select('package_id')
    .eq('student_id', studentId);

  if (packages?.length) {
    for (const pkg of packages) {
      const { data: pkgComments } = await supabase
        .from('package_comments')
        .select('comment, created_at, profiles(full_name)')
        .eq('package_id', pkg.package_id)
        .order('created_at', { ascending: true });

      pkgComments?.forEach(c => {
        notes.push({
          type: 'Package',
          entity_name: studentName,
          comment: c.comment,
          author: (c.profiles as any)?.full_name || 'System',
          date: c.created_at,
        });
      });
    }
  }

  // Sort all notes chronologically
  notes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Generate HTML for printing/PDF
  const stageColors: Record<string, string> = {
    Lead: '#f97316',
    Trial: '#3b82f6',
    Student: '#22c55e',
    Package: '#a855f7',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Journey History - ${studentName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 30px; }
    .timeline { position: relative; padding-left: 30px; }
    .timeline::before { content: ''; position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: #e5e7eb; }
    .entry { position: relative; margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .entry::before { content: ''; position: absolute; left: -24px; top: 16px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: white; margin-right: 8px; }
    .meta { font-size: 12px; color: #888; margin-top: 4px; }
    .comment { font-size: 14px; white-space: pre-wrap; margin-top: 4px; line-height: 1.5; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { padding: 12px; border-radius: 8px; text-align: center; }
    .stat-num { font-size: 20px; font-weight: 700; }
    .stat-label { font-size: 11px; color: #666; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>📋 Journey History — ${studentName}</h1>
  <p class="subtitle">Exported on ${format(new Date(), 'dd MMM yyyy, HH:mm')} · ${notes.length} entries</p>
  
  <div class="stats">
    ${['Lead', 'Trial', 'Student', 'Package'].map(type => {
      const count = notes.filter(n => n.type === type).length;
      return `<div class="stat-card" style="background: ${stageColors[type]}15; border: 1px solid ${stageColors[type]}30">
        <div class="stat-num" style="color: ${stageColors[type]}">${count}</div>
        <div class="stat-label">${type} Notes</div>
      </div>`;
    }).join('')}
  </div>

  <div class="timeline">
    ${notes.map(n => `
      <div class="entry">
        <div style="position:absolute;left:-24px;top:16px;width:10px;height:10px;border-radius:50%;background:${stageColors[n.type] || '#888'};border:2px solid white;"></div>
        <div>
          <span class="badge" style="background:${stageColors[n.type] || '#888'}">${n.type}</span>
          <span style="font-size:13px;font-weight:500;">${n.author}</span>
        </div>
        <div class="comment">${n.comment.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="meta">${format(new Date(n.date), 'dd MMM yyyy, HH:mm')}</div>
      </div>
    `).join('')}
  </div>
  
  ${notes.length === 0 ? '<p style="text-align:center;color:#888;padding:40px">No notes found for this student journey.</p>' : ''}
</body>
</html>`;

  // Open in new tab for print/save as PDF
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
