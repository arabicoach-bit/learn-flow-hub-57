import jsPDF from 'jspdf';

export interface TrialReportPdfData {
  studentName: string;
  teacherName: string;
  program: string;
  trialDate: string;
  trialTime: string;
  duration: string;
  age: string;
  yearGroup: string;
  readingStrengths: string[];
  readingNextSteps: string[];
  speakingStrengths: string[];
  speakingNextSteps: string[];
  teacherNotes: string;
  finalText: string;
}

export function generateTrialReportPdf(data: TrialReportPdfData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // blue-600
  const darkColor: [number, number, number] = [17, 24, 39]; // gray-900
  const mutedColor: [number, number, number] = [107, 114, 128]; // gray-500
  const greenColor: [number, number, number] = [22, 163, 74]; // green-600
  const amberColor: [number, number, number] = [217, 119, 6]; // amber-600

  // ===== Header =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageW, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Trial Lesson Report', pageW / 2, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName, pageW / 2, 30, { align: 'center' });

  y = 50;

  // ===== Student Info Box =====
  doc.setFillColor(243, 244, 246); // gray-100
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');

  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const col1 = margin + 5;
  const col2 = margin + contentW / 3;
  const col3 = margin + (contentW * 2) / 3;

  doc.text('Teacher', col1, y + 8);
  doc.text('Program', col2, y + 8);
  doc.text('Date', col3, y + 8);

  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.teacherName || 'N/A', col1, y + 14);
  doc.text(data.program || 'N/A', col2, y + 14);
  doc.text(data.trialDate || 'N/A', col3, y + 14);

  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Duration', col1, y + 22);
  doc.text('Time', col2, y + 22);
  doc.text('Age / Year', col3, y + 22);

  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.duration || '30 minutes', col1, y + 28);
  doc.text(data.trialTime || 'N/A', col2, y + 28);
  doc.text([data.age, data.yearGroup].filter(Boolean).join(' / ') || 'N/A', col3, y + 28);

  y += 38;

  // ===== Helper Functions =====
  const drawSectionTitle = (title: string, icon: string, color: [number, number, number]) => {
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon}  ${title}`, margin + 5, y + 6);
    y += 12;
  };

  const drawSubsection = (label: string, items: string[], color: [number, number, number]) => {
    if (items.length === 0) return;
    
    doc.setTextColor(...color);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 2, y);
    y += 5;

    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    items.forEach(item => {
      const lines = doc.splitTextToSize(`•  ${item}`, contentW - 8);
      if (y + lines.length * 4.5 > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.5;
    });
    y += 3;
  };

  // ===== Reading Section =====
  drawSectionTitle('Reading', '📖', primaryColor);
  drawSubsection('Strengths', data.readingStrengths, greenColor);
  drawSubsection('Next Steps', data.readingNextSteps, amberColor);

  y += 4;

  // ===== Speaking & Listening Section =====
  drawSectionTitle('Speaking & Listening', '🗣️', [124, 58, 237]); // purple
  drawSubsection('Strengths', data.speakingStrengths, greenColor);
  drawSubsection('Next Steps', data.speakingNextSteps, amberColor);

  // ===== Teacher Notes =====
  if (data.teacherNotes?.trim()) {
    y += 4;
    if (y > 240) { doc.addPage(); y = 20; }
    drawSectionTitle('Teacher Notes', '📝', [75, 85, 99]); // gray-600
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(data.teacherNotes, contentW - 8);
    if (y + noteLines.length * 4.5 > 270) { doc.addPage(); y = 20; }
    doc.text(noteLines, margin + 4, y);
    y += noteLines.length * 4.5 + 4;
  }

  // ===== Summary Paragraph =====
  y += 4;
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin + 5, y + 6);
  y += 12;

  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(data.finalText, contentW - 4);
  if (y + summaryLines.length * 4.5 > 270) { doc.addPage(); y = 20; }
  doc.text(summaryLines, margin + 2, y);
  y += summaryLines.length * 4.5;

  // ===== Footer =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(243, 244, 246);
    doc.rect(0, 285, pageW, 12, 'F');
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 291);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, 291, { align: 'right' });
  }

  return doc;
}
