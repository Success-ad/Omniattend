export type EnrollmentStatus = 'enrolled' | 'dropped' | 'completed';

export interface StudentCurrentEnrollment {
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterId: string;
  semesterName?: string;
  department: string;
  lecturerId: string;
  lecturerName?: string;
  enrolledAt: string;
  status: 'enrolled';
}

export interface AttendanceHistoryEntry {
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterId: string;
  semesterName: string;
  department: string;
  lecturerId: string;
  lecturerName?: string;
  attendedClasses: number;
  totalClasses: number;
  percentage: number;
  archivedAt: string;
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  student_name?: string;
  course_id: string;
  course_code: string;
  course_name: string;
  semester_id: string;
  semester_name?: string;
  department: string;
  lecturer_id: string;
  lecturer_name?: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  dropped_at?: string | null;
  completed_at?: string | null;
  attended_classes?: number;
  total_classes?: number;
  percentage?: number;
}
