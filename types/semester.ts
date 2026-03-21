export type SemesterStatus = 'active' | 'completed' | 'upcoming';

export interface Semester {
  id: string;
  semester_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: SemesterStatus;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface CreateSemesterInput {
  semester_name: string;
  start_date: string;
  end_date: string;
}
