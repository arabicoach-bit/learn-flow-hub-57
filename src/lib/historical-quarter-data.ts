/**
 * Historical quarterly teacher performance data (pre-system launch).
 * The system started in Feb 2026, so data before that is stored here as static records.
 * This data is merged into the Quarter Analysis hook for past months only.
 * It will NEVER override live database data for Feb 2026 onwards.
 */

// Cutoff: months strictly before this date use historical data
export const SYSTEM_LAUNCH_DATE = '2026-02-01';

export interface HistoricalTeacherMonth {
  teacherName: string;
  month: string; // e.g. 'Sep 2025'
  hourRate: number;
  totalHours: number;
  salary: number;
  activeStudents: number;
  stoppedStudents: number;
  leftStudents: number;
  retentionRate: number;
  trialsConducted: number;
  trialConversions: number;
  trialConversionRate: number;
  bonus: number;
  notes?: string;
}

// ===== Q1 2025/2026: Sep, Oct, Nov 2025 =====
const q1Data: HistoricalTeacherMonth[] = [
  // Mrs.Hind Tantawy
  { teacherName: 'Mrs.Hind Tantawy', month: 'Sep 2025', hourRate: 250, totalHours: 35.25, salary: 8812.5, activeStudents: 9, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 6, trialConversions: 5, trialConversionRate: 83, bonus: 7500 },
  { teacherName: 'Mrs.Hind Tantawy', month: 'Oct 2025', hourRate: 250, totalHours: 44.5, salary: 11125, activeStudents: 9, stoppedStudents: 0, leftStudents: 1, retentionRate: 90, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 7500 },
  { teacherName: 'Mrs.Hind Tantawy', month: 'Nov 2025', hourRate: 250, totalHours: 44.75, salary: 11187.5, activeStudents: 9, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 4, trialConversions: 4, trialConversionRate: 100, bonus: 8250 },

  // Mr. Ahmed Hamdy
  { teacherName: 'Mr. Ahmed Hamdy', month: 'Sep 2025', hourRate: 175, totalHours: 69, salary: 12075, activeStudents: 11, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 5, trialConversions: 4, trialConversionRate: 80, bonus: 0 },
  { teacherName: 'Mr. Ahmed Hamdy', month: 'Oct 2025', hourRate: 175, totalHours: 79.5, salary: 13912.5, activeStudents: 12, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0, notes: 'اديت استأنف دروسه' },
  { teacherName: 'Mr. Ahmed Hamdy', month: 'Nov 2025', hourRate: 175, totalHours: 81.5, salary: 14262.5, activeStudents: 12, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 2, trialConversions: 2, trialConversionRate: 100, bonus: 750 },

  // Mrs.Noura
  { teacherName: 'Mrs.Noura', month: 'Sep 2025', hourRate: 175, totalHours: 30.5, salary: 5337.5, activeStudents: 8, stoppedStudents: 0, leftStudents: 1, retentionRate: 89, trialsConducted: 3, trialConversions: 1, trialConversionRate: 33, bonus: 0 },
  { teacherName: 'Mrs.Noura', month: 'Oct 2025', hourRate: 175, totalHours: 34, salary: 6120, activeStudents: 8, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mrs.Noura', month: 'Nov 2025', hourRate: 175, totalHours: 39, salary: 6825, activeStudents: 8, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Ms.Marwa Hamdy
  { teacherName: 'Ms.Marwa Hamdy', month: 'Sep 2025', hourRate: 150, totalHours: 0, salary: 0, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Ms.Marwa Hamdy', month: 'Oct 2025', hourRate: 150, totalHours: 32, salary: 4800, activeStudents: 7, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 14, trialConversions: 7, trialConversionRate: 50, bonus: 0 },
  { teacherName: 'Ms.Marwa Hamdy', month: 'Nov 2025', hourRate: 150, totalHours: 50.5, salary: 7575, activeStudents: 10, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 9, trialConversions: 1, trialConversionRate: 11, bonus: 750 },

  // Mr.Abdallah
  { teacherName: 'Mr.Abdallah', month: 'Sep 2025', hourRate: 150, totalHours: 4, salary: 600, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 5, trialConversions: 1, trialConversionRate: 20, bonus: 0 },
  { teacherName: 'Mr.Abdallah', month: 'Oct 2025', hourRate: 150, totalHours: 33, salary: 4950, activeStudents: 4, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr.Abdallah', month: 'Nov 2025', hourRate: 150, totalHours: 16.25, salary: 2437.5, activeStudents: 2, stoppedStudents: 0, leftStudents: 2, retentionRate: 50, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr.Ahmed Mohamed
  { teacherName: 'Mr.Ahmed Mohamed', month: 'Sep 2025', hourRate: 150, totalHours: 7.75, salary: 1162.5, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 6, trialConversions: 5, trialConversionRate: 83, bonus: 0 },
  { teacherName: 'Mr.Ahmed Mohamed', month: 'Oct 2025', hourRate: 150, totalHours: 7.75, salary: 1162.5, activeStudents: 7, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 2, trialConversions: 2, trialConversionRate: 100, bonus: 0 },
  { teacherName: 'Mr.Ahmed Mohamed', month: 'Nov 2025', hourRate: 150, totalHours: 36, salary: 5400, activeStudents: 8, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 3, trialConversions: 2, trialConversionRate: 67, bonus: 750 },

  // Mrs.Eman Elatreby
  { teacherName: 'Mrs.Eman Elatreby', month: 'Sep 2025', hourRate: 175, totalHours: 47.25, salary: 8268.75, activeStudents: 9, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 6, trialConversions: 5, trialConversionRate: 83, bonus: 0 },
  { teacherName: 'Mrs.Eman Elatreby', month: 'Oct 2025', hourRate: 175, totalHours: 80, salary: 14000, activeStudents: 12, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 1, trialConversions: 1, trialConversionRate: 100, bonus: 0 },
  { teacherName: 'Mrs.Eman Elatreby', month: 'Nov 2025', hourRate: 175, totalHours: 80.25, salary: 14043.75, activeStudents: 13, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 3, trialConversions: 2, trialConversionRate: 67, bonus: 1500 },

  // Mrs.Abla
  { teacherName: 'Mrs.Abla', month: 'Sep 2025', hourRate: 150, totalHours: 34, salary: 5100, activeStudents: 11, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 6, trialConversions: 6, trialConversionRate: 100, bonus: 0 },
  { teacherName: 'Mrs.Abla', month: 'Oct 2025', hourRate: 175, totalHours: 71.25, salary: 12468.75, activeStudents: 12, stoppedStudents: 0, leftStudents: 1, retentionRate: 92, trialsConducted: 2, trialConversions: 1, trialConversionRate: 50, bonus: 0 },
  { teacherName: 'Mrs.Abla', month: 'Nov 2025', hourRate: 175, totalHours: 38.25, salary: 6693.75, activeStudents: 11, stoppedStudents: 0, leftStudents: 1, retentionRate: 92, trialsConducted: 4, trialConversions: 2, trialConversionRate: 50, bonus: 750 },

  // Mr. Mahmoud Abdelmoneam
  { teacherName: 'Mr. Mahmoud Abdelmoneam', month: 'Sep 2025', hourRate: 175, totalHours: 7, salary: 1225, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 7, trialConversions: 4, trialConversionRate: 57, bonus: 0 },
  { teacherName: 'Mr. Mahmoud Abdelmoneam', month: 'Oct 2025', hourRate: 175, totalHours: 31, salary: 5425, activeStudents: 7, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 6, trialConversions: 4, trialConversionRate: 67, bonus: 0 },
  { teacherName: 'Mr. Mahmoud Abdelmoneam', month: 'Nov 2025', hourRate: 175, totalHours: 67.5, salary: 11812.5, activeStudents: 10, stoppedStudents: 0, leftStudents: 2, retentionRate: 83, trialsConducted: 5, trialConversions: 3, trialConversionRate: 60, bonus: 0, notes: 'توقف سليمان وعبدالرحمن' },

  // Ms.Eman Mustafa
  { teacherName: 'Ms.Eman Mustafa', month: 'Sep 2025', hourRate: 150, totalHours: 0, salary: 0, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 3, trialConversions: 2, trialConversionRate: 67, bonus: 0 },
  { teacherName: 'Ms.Eman Mustafa', month: 'Oct 2025', hourRate: 150, totalHours: 18.25, salary: 2737.5, activeStudents: 2, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 2, trialConversions: 2, trialConversionRate: 100, bonus: 0 },
  { teacherName: 'Ms.Eman Mustafa', month: 'Nov 2025', hourRate: 150, totalHours: 16.25, salary: 2437.5, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 1, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr. Gouda
  { teacherName: 'Mr. Gouda', month: 'Sep 2025', hourRate: 250, totalHours: 28.75, salary: 7187.5, activeStudents: 5, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr. Gouda', month: 'Oct 2025', hourRate: 250, totalHours: 25.5, salary: 6375, activeStudents: 5, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr. Gouda', month: 'Nov 2025', hourRate: 250, totalHours: 26, salary: 6500, activeStudents: 5, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 1000 },

  // Mr. Emad Abouserie
  { teacherName: 'Mr. Emad Abouserie', month: 'Sep 2025', hourRate: 250, totalHours: 0, salary: 0, activeStudents: 1, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 2, trialConversions: 2, trialConversionRate: 100, bonus: 0 },
  { teacherName: 'Mr. Emad Abouserie', month: 'Oct 2025', hourRate: 250, totalHours: 18.75, salary: 4687.5, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 3, trialConversions: 3, trialConversionRate: 100, bonus: 0 },
  { teacherName: 'Mr. Emad Abouserie', month: 'Nov 2025', hourRate: 250, totalHours: 25.75, salary: 6437.5, activeStudents: 4, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 1, trialConversions: 1, trialConversionRate: 100, bonus: 0 },
];

// ===== Q2 2025/2026: Dec 2025 & Jan 2026 (pre-system months only) =====
const q2PreSystemData: HistoricalTeacherMonth[] = [
  // Mrs.Hind Tantawy
  { teacherName: 'Mrs.Hind Tantawy', month: 'Dec 2025', hourRate: 250, totalHours: 31, salary: 7750, activeStudents: 9, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 2, trialConversions: 1, trialConversionRate: 50, bonus: 7500 },
  { teacherName: 'Mrs.Hind Tantawy', month: 'Jan 2026', hourRate: 250, totalHours: 55, salary: 13750, activeStudents: 9, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 7500 },

  // Mr. Ahmed Hamdy
  { teacherName: 'Mr. Ahmed Hamdy', month: 'Dec 2025', hourRate: 175, totalHours: 60.5, salary: 3660.25, activeStudents: 11, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr. Ahmed Hamdy', month: 'Jan 2026', hourRate: 175, totalHours: 78.5, salary: 13737.5, activeStudents: 12, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mrs.Noura
  { teacherName: 'Mrs.Noura', month: 'Dec 2025', hourRate: 175, totalHours: 21.5, salary: 3762.5, activeStudents: 8, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mrs.Noura', month: 'Jan 2026', hourRate: 175, totalHours: 22, salary: 3850, activeStudents: 8, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Ms.Marwa Hamdy
  { teacherName: 'Ms.Marwa Hamdy', month: 'Dec 2025', hourRate: 150, totalHours: 37.45, salary: 5617.5, activeStudents: 8, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 1, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Ms.Marwa Hamdy', month: 'Jan 2026', hourRate: 150, totalHours: 58.5, salary: 8775, activeStudents: 7, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr.Abdallah
  { teacherName: 'Mr.Abdallah', month: 'Dec 2025', hourRate: 150, totalHours: 20.5, salary: 3075, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr.Abdallah', month: 'Jan 2026', hourRate: 150, totalHours: 31, salary: 4650, activeStudents: 4, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr.Ahmed Mohamed
  { teacherName: 'Mr.Ahmed Mohamed', month: 'Dec 2025', hourRate: 150, totalHours: 18, salary: 2700, activeStudents: 5, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 3, trialConversions: 0, trialConversionRate: 0, bonus: 900 },
  { teacherName: 'Mr.Ahmed Mohamed', month: 'Jan 2026', hourRate: 150, totalHours: 28.75, salary: 4312.5, activeStudents: 7, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mrs.Eman Elatreby
  { teacherName: 'Mrs.Eman Elatreby', month: 'Dec 2025', hourRate: 175, totalHours: 60.5, salary: 10587.5, activeStudents: 9, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 3, trialConversions: 2, trialConversionRate: 67, bonus: 0 },
  { teacherName: 'Mrs.Eman Elatreby', month: 'Jan 2026', hourRate: 175, totalHours: 82.5, salary: 14437.5, activeStudents: 12, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mrs.Abla
  { teacherName: 'Mrs.Abla', month: 'Dec 2025', hourRate: 175, totalHours: 47, salary: 8225, activeStudents: 11, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 1, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mrs.Abla', month: 'Jan 2026', hourRate: 175, totalHours: 57, salary: 9975, activeStudents: 12, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr. Mahmoud Abdelmoneam
  { teacherName: 'Mr. Mahmoud Abdelmoneam', month: 'Dec 2025', hourRate: 150, totalHours: 24.75, salary: 3712.5, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr. Mahmoud Abdelmoneam', month: 'Jan 2026', hourRate: 150, totalHours: 47.5, salary: 7125, activeStudents: 7, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 500 },

  // Ms.Eman Mustafa
  { teacherName: 'Ms.Eman Mustafa', month: 'Dec 2025', hourRate: 150, totalHours: 22, salary: 3300, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Ms.Eman Mustafa', month: 'Jan 2026', hourRate: 150, totalHours: 14, salary: 2100, activeStudents: 2, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 1, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr. Gouda
  { teacherName: 'Mr. Gouda', month: 'Dec 2025', hourRate: 250, totalHours: 27, salary: 6750, activeStudents: 5, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr. Gouda', month: 'Jan 2026', hourRate: 250, totalHours: 30, salary: 7500, activeStudents: 5, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr. Emad Abouserie
  { teacherName: 'Mr. Emad Abouserie', month: 'Dec 2025', hourRate: 250, totalHours: 35, salary: 8750, activeStudents: 1, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr. Emad Abouserie', month: 'Jan 2026', hourRate: 250, totalHours: 42.5, salary: 10625, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mr.Yossef (new in Q2)
  { teacherName: 'Mr.Yossef', month: 'Dec 2025', hourRate: 150, totalHours: 0, salary: 0, activeStudents: 1, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mr.Yossef', month: 'Jan 2026', hourRate: 150, totalHours: 0, salary: 0, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },

  // Mrs.Aml (new in Q2)
  { teacherName: 'Mrs.Aml', month: 'Dec 2025', hourRate: 150, totalHours: 0, salary: 0, activeStudents: 1, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
  { teacherName: 'Mrs.Aml', month: 'Jan 2026', hourRate: 150, totalHours: 0, salary: 0, activeStudents: 3, stoppedStudents: 0, leftStudents: 0, retentionRate: 100, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 },
];

export const ALL_HISTORICAL_DATA: HistoricalTeacherMonth[] = [...q1Data, ...q2PreSystemData];

/**
 * Check if a month label (e.g. "Sep 2025") is before the system launch.
 */
export function isHistoricalMonth(monthLabel: string): boolean {
  // Parse "Sep 2025" → Date
  const d = new Date(monthLabel + ' 1');
  if (isNaN(d.getTime())) return false;
  return d < new Date(SYSTEM_LAUNCH_DATE);
}

/**
 * Get historical teacher data for a specific month label.
 */
export function getHistoricalDataForMonth(monthLabel: string): HistoricalTeacherMonth[] {
  return ALL_HISTORICAL_DATA.filter(d => d.month === monthLabel);
}

/**
 * Get unique teacher names from historical data.
 */
export function getHistoricalTeacherNames(): string[] {
  return [...new Set(ALL_HISTORICAL_DATA.map(d => d.teacherName))];
}
