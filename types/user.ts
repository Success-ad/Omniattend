import type { AttendanceHistoryEntry, StudentCurrentEnrollment } from './enrollment';

export type AppRole = 'student' | 'lecturer' | 'admin';

export interface StudentProfile {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  matricNumber: string;
  email: string;
  phoneNumber: string;
  department: string;
  level: string;
  enrolledCourses: string[];
  current_enrollments: StudentCurrentEnrollment[];
  attendance_history: AttendanceHistoryEntry[];
  role: 'student';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LecturerProfile {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: string;
  phoneNumber: string;
  createdCourses: string[];
  role: 'lecturer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfile {
  uid: string;
  fullName: string;
  email: string;
  role: 'admin';
  createdAt?: string;
  updatedAt?: string;
}
