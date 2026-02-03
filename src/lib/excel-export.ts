import * as XLSX from 'xlsx';

interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => string | number | null | undefined);
}

function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
) {
  const headers = columns.map(c => c.header);
  
  const rows = data.map(item => {
    return columns.map(col => {
      if (typeof col.accessor === 'function') {
        return col.accessor(item) ?? '';
      }
      return (item[col.accessor] as unknown) ?? '';
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Auto-size columns
  const maxWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(row => String(row[i]).length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  worksheet['!cols'] = maxWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Trial Students Export
export interface TrialStudentExport {
  name: string;
  phone: string;
  parent_guardian_name?: string | null;
  age?: number | null;
  gender?: string | null;
  school?: string | null;
  year_group?: string | null;
  interested_program?: string | null;
  student_level?: string | null;
  trial_date?: string | null;
  trial_time?: string | null;
  duration_minutes?: number;
  status: string;
  trial_result?: string | null;
  teacher_name?: string | null;
  notes?: string | null;
  follow_up_notes?: string | null;
  created_at?: string | null;
}

export function exportTrialStudents(data: TrialStudentExport[]) {
  const columns: ExportColumn<TrialStudentExport>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Parent/Guardian', accessor: 'parent_guardian_name' },
    { header: 'Age', accessor: 'age' },
    { header: 'Gender', accessor: 'gender' },
    { header: 'School', accessor: 'school' },
    { header: 'Year Group', accessor: 'year_group' },
    { header: 'Interested Program', accessor: 'interested_program' },
    { header: 'Level', accessor: 'student_level' },
    { header: 'Trial Date', accessor: 'trial_date' },
    { header: 'Trial Time', accessor: 'trial_time' },
    { header: 'Duration (min)', accessor: 'duration_minutes' },
    { header: 'Status', accessor: 'status' },
    { header: 'Result', accessor: 'trial_result' },
    { header: 'Teacher', accessor: 'teacher_name' },
    { header: 'Notes', accessor: 'notes' },
    { header: 'Follow-up Notes', accessor: 'follow_up_notes' },
    { header: 'Created', accessor: 'created_at' },
  ];
  
  exportToExcel(data, columns, `trial-students-${new Date().toISOString().split('T')[0]}`);
}

// Registered Students Export
export interface StudentExport {
  name: string;
  phone: string;
  parent_phone?: string | null;
  parent_guardian_name?: string | null;
  age?: number | null;
  gender?: string | null;
  nationality?: string | null;
  school?: string | null;
  year_group?: string | null;
  student_level?: string | null;
  program_name?: string | null;
  teacher_name?: string | null;
  status?: string | null;
  wallet_balance?: number | null;
  total_paid?: number | null;
  number_of_renewals?: number | null;
  created_at?: string | null;
}

export function exportStudents(data: StudentExport[]) {
  const columns: ExportColumn<StudentExport>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Parent Phone', accessor: 'parent_phone' },
    { header: 'Parent/Guardian', accessor: 'parent_guardian_name' },
    { header: 'Age', accessor: 'age' },
    { header: 'Gender', accessor: 'gender' },
    { header: 'Nationality', accessor: 'nationality' },
    { header: 'School', accessor: 'school' },
    { header: 'Year Group', accessor: 'year_group' },
    { header: 'Level', accessor: 'student_level' },
    { header: 'Program', accessor: 'program_name' },
    { header: 'Teacher', accessor: 'teacher_name' },
    { header: 'Status', accessor: 'status' },
    { header: 'Wallet Balance', accessor: 'wallet_balance' },
    { header: 'Total Paid (AED)', accessor: 'total_paid' },
    { header: 'Renewals', accessor: 'number_of_renewals' },
    { header: 'Created', accessor: 'created_at' },
  ];
  
  exportToExcel(data, columns, `students-${new Date().toISOString().split('T')[0]}`);
}

// Leads Export
export interface LeadExport {
  name: string;
  phone: string;
  source?: string | null;
  interest?: string | null;
  status?: string | null;
  first_contact_date?: string | null;
  last_contact_date?: string | null;
  next_followup_date?: string | null;
  handled_by?: string | null;
  notes?: string | null;
  trial_status?: string | null;
  follow_up?: string | null;
  created_at?: string | null;
}

export function exportLeads(data: LeadExport[]) {
  const columns: ExportColumn<LeadExport>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Source', accessor: 'source' },
    { header: 'Interest', accessor: 'interest' },
    { header: 'Status', accessor: 'status' },
    { header: 'First Contact', accessor: 'first_contact_date' },
    { header: 'Last Contact', accessor: 'last_contact_date' },
    { header: 'Next Follow-up', accessor: 'next_followup_date' },
    { header: 'Handled By', accessor: 'handled_by' },
    { header: 'Trial Status', accessor: 'trial_status' },
    { header: 'Follow-up', accessor: 'follow_up' },
    { header: 'Notes', accessor: 'notes' },
    { header: 'Created', accessor: 'created_at' },
  ];
  
  exportToExcel(data, columns, `leads-${new Date().toISOString().split('T')[0]}`);
}

// Packages Export
export interface PackageExport {
  student_name?: string | null;
  package_type?: string | null;
  amount: number;
  lessons_purchased: number;
  lessons_used?: number | null;
  lessons_remaining?: number;
  status?: string | null;
  payment_date?: string | null;
  start_date?: string | null;
  next_payment_date?: string | null;
  completed_date?: string | null;
  is_renewal?: boolean | null;
  created_at?: string | null;
}

export function exportPackages(data: PackageExport[]) {
  const columns: ExportColumn<PackageExport>[] = [
    { header: 'Student', accessor: 'student_name' },
    { header: 'Package Type', accessor: 'package_type' },
    { header: 'Amount (AED)', accessor: 'amount' },
    { header: 'Lessons Purchased', accessor: 'lessons_purchased' },
    { header: 'Lessons Used', accessor: 'lessons_used' },
    { header: 'Lessons Remaining', accessor: item => (item.lessons_purchased - (item.lessons_used || 0)) },
    { header: 'Status', accessor: 'status' },
    { header: 'Payment Date', accessor: 'payment_date' },
    { header: 'Start Date', accessor: 'start_date' },
    { header: 'Next Payment', accessor: 'next_payment_date' },
    { header: 'Completed Date', accessor: 'completed_date' },
    { header: 'Is Renewal', accessor: item => item.is_renewal ? 'Yes' : 'No' },
    { header: 'Created', accessor: 'created_at' },
  ];
  
  exportToExcel(data, columns, `packages-${new Date().toISOString().split('T')[0]}`);
}
