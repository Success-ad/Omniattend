export type CourseStatus = 'active' | 'completed';

export interface Course {
  id: string;
  course_code: string;
  course_name: string;
  description: string;
  department: string;
  semester_id: string;
  semester_name?: string;
  lecturer_id: string;
  lecturer_name?: string;
  enrolled_count: number;
  status: CourseStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCourseInput {
  course_code: string;
  course_name: string;
  description: string;
  department: string;
  semester_id: string;
  semester_name?: string;
  lecturer_id: string;
  lecturer_name?: string;
}
