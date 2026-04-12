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
  gender: string;
  readingStrengths: string[];
  readingNextSteps: string[];
  speakingStrengths: string[];
  speakingNextSteps: string[];
  teacherNotes: string;
  finalText: string;
}

function personalizeText(text: string, name: string, gender: string): string {
  const isMale = gender?.toLowerCase() === 'male';
  const isFemale = gender?.toLowerCase() === 'female';

  let result = text;
  // Replace "The student" / "the student" with name
  result = result.replace(/\bThe student\b/g, name);
  result = result.replace(/\bthe student\b/g, name);

  // Gender pronouns
  if (isMale) {
    result = result.replace(/\b(he|she)\b/g, 'he');
    result = result.replace(/\b(He|She)\b/g, 'He');
    result = result.replace(/\b(his|her)\b/g, 'his');
    result = result.replace(/\b(His|Her)\b/g, 'His');
    result = result.replace(/\b(him|her)\b/g, 'him');
    result = result.replace(/\b(Him|Her)\b/g, 'Him');
  } else if (isFemale) {
    result = result.replace(/\b(he|she)\b/g, 'she');
    result = result.replace(/\b(He|She)\b/g, 'She');
    result = result.replace(/\b(his|her)\b/g, 'her');
    result = result.replace(/\b(His|Her)\b/g, 'Her');
    result = result.replace(/\b(him|her)\b/g, 'her');
    result = result.replace(/\b(Him|Her)\b/g, 'Her');
  }

  return result;
}

export function generateTrialReportPdf(data: TrialReportPdfData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 8;

  // Brand colors matching package summary
  const navy: [number, number, number] = [45, 53, 97];
  const gold: [number, number, number] = [245, 197, 24];
  const darkText: [number, number, number] = [26, 26, 46];
  const muted: [number, number, number] = [128, 128, 128];
  const green: [number, number, number] = [34, 197, 94];
  const amber: [number, number, number] = [217, 119, 6];
  const purple: [number, number, number] = [124, 58, 237];

  const personalize = (t: string) => personalizeText(t, data.studentName, data.gender);

  // Header text (logo added asynchronously via generateTrialReportPdfWithLogo)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('OAC Academy', 55, y + 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gold);
  doc.text('Online Arabic Courses', 55, y + 20);
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Trial Lesson Report', 55, y + 27);

  // Gold line
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  y += 35;
  doc.line(margin, y, pageW - margin, y);

  // Generated date
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW / 2, y, { align: 'center' });

  y += 8;

  // ===== STUDENT INFORMATION =====
  const drawSectionHeader = (title: string) => {
    doc.setFillColor(...navy);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, y + 6);
    y += 14;
  };

  const infoLine = (label: string, value: string, x: number, yPos: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(label, x, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + doc.getTextWidth(label) + 2, yPos);
  };

  drawSectionHeader('Student Information');
  infoLine('Student: ', data.studentName, margin + 4, y);
  infoLine('Teacher: ', data.teacherName || 'N/A', 110, y);
  y += 6;
  infoLine('Program: ', data.program || 'N/A', margin + 4, y);
  infoLine('Date: ', data.trialDate || 'N/A', 110, y);
  y += 6;
  infoLine('Duration: ', data.duration || '30 minutes', margin + 4, y);
  infoLine('Time: ', data.trialTime || 'N/A', 110, y);
  y += 6;
  const ageYear = [data.age, data.yearGroup].filter(Boolean).join(' / ') || 'N/A';
  infoLine('Age / Year: ', ageYear, margin + 4, y);
  y += 10;

  // ===== READING SECTION =====
  const drawSkillSection = (
    title: string,
    color: [number, number, number],
    strengths: string[],
    nextSteps: string[]
  ) => {
    // Check page space
    if (y > 230) { doc.addPage(); y = 20; }

    // Section header
    doc.setFillColor(...color);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, y + 6);
    y += 13;

    // Strengths paragraph
    if (strengths.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...green);
      doc.text('Strengths', margin + 4, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkText);
      const paragraph = strengths.map(s => personalize(s)).join('. ') + '.';
      const lines = doc.splitTextToSize(paragraph, contentW - 8);
      if (y + lines.length * 4.5 > 275) { doc.addPage(); y = 20; }
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.5 + 3;
    }

    // Next Steps paragraph
    if (nextSteps.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...amber);
      doc.text('Next Steps', margin + 4, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkText);
      const paragraph = nextSteps.map(s => personalize(s)).join('. ') + '.';
      const lines = doc.splitTextToSize(paragraph, contentW - 8);
      if (y + lines.length * 4.5 > 275) { doc.addPage(); y = 20; }
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.5 + 3;
    }

    y += 4;
  };

  drawSkillSection('Reading', navy, data.readingStrengths, data.readingNextSteps);
  drawSkillSection('Speaking & Listening', purple, data.speakingStrengths, data.speakingNextSteps);

  // ===== TEACHER NOTES =====
  if (data.teacherNotes?.trim()) {
    if (y > 240) { doc.addPage(); y = 20; }
    drawSectionHeader('Additional Notes');
    doc.setTextColor(...darkText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(data.teacherNotes, contentW - 8);
    if (y + noteLines.length * 4.5 > 275) { doc.addPage(); y = 20; }
    doc.text(noteLines, margin + 4, y);
    y += noteLines.length * 4.5 + 6;
  }

  // ===== SUMMARY PARAGRAPH =====
  if (data.finalText?.trim()) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('Summary', margin + 4, y + 6);
    y += 13;

    doc.setTextColor(...darkText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(personalize(data.finalText), contentW - 8);
    if (y + summaryLines.length * 4.5 > 275) { doc.addPage(); y = 20; }
    doc.text(summaryLines, margin + 4, y);
    y += summaryLines.length * 4.5;
  }

  // ===== FOOTER on all pages =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Gold line at bottom
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.line(margin, 282, pageW - margin, 282);
    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text('OAC Academy — Trial Lesson Report', margin, 288);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, 288, { align: 'right' });
  }

  return doc;
}

/**
 * Generates the PDF with the OAC logo loaded asynchronously
 */
export async function generateTrialReportPdfWithLogo(data: TrialReportPdfData): Promise<jsPDF> {
  const doc = generateTrialReportPdf(data);

  // Try to add logo
  try {
    const logoData = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d')?.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = '/oac-logo.png';
    });

    if (logoData) {
      // Add logo to page 1
      doc.setPage(1);
      doc.addImage(logoData, 'PNG', 14, 8, 35, 35);
    }
  } catch {
    // Logo not available, continue without it
  }

  return doc;
}
