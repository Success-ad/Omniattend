import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from './firebaseClient';
import { assertRoleAccess } from './roleService';
import {
  createSemester,
  getActiveSemester,
  getAllSemesters,
  getSemesterById,
} from './semesterService';
import type { Course } from '../types/course';
import type {
  AttendanceHistoryEntry,
  CourseEnrollment,
  StudentCurrentEnrollment,
} from '../types/enrollment';
import type { CreateSemesterInput } from '../types/semester';
import type { AdminProfile, LecturerProfile, StudentProfile } from '../types/user';

const mapAdminProfile = (id: string, data: Record<string, any>): AdminProfile => ({
  uid: data.uid ?? id,
  fullName: data.fullName ?? '',
  email: data.email ?? '',
  role: 'admin',
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

const mapStudent = (id: string, data: Record<string, any>): StudentProfile => ({
  uid: data.uid ?? id,
  firstName: data.firstName ?? '',
  lastName: data.lastName ?? '',
  fullName:
    data.fullName ??
    [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
  matricNumber: data.matricNumber ?? '',
  email: data.email ?? '',
  phoneNumber: data.phoneNumber ?? '',
  department: data.department ?? '',
  level: data.level ?? '',
  enrolledCourses: Array.isArray(data.enrolledCourses) ? data.enrolledCourses : [],
  current_enrollments: Array.isArray(data.current_enrollments) ? data.current_enrollments : [],
  attendance_history: Array.isArray(data.attendance_history) ? data.attendance_history : [],
  role: 'student',
  isActive: data.isActive ?? true,
  createdAt: data.createdAt ?? '',
  updatedAt: data.updatedAt ?? data.createdAt ?? '',
});

const mapLecturer = (id: string, data: Record<string, any>): LecturerProfile => ({
  uid: data.uid ?? id,
  firstName: data.firstName ?? '',
  lastName: data.lastName ?? '',
  fullName:
    data.fullName ??
    [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
  email: data.email ?? '',
  department: data.department ?? '',
  phoneNumber: data.phoneNumber ?? '',
  createdCourses: Array.isArray(data.createdCourses) ? data.createdCourses : [],
  role: 'lecturer',
  isActive: data.isActive ?? true,
  createdAt: data.createdAt ?? '',
  updatedAt: data.updatedAt ?? data.createdAt ?? '',
});

const mapCourse = (id: string, data: Record<string, any>): Course => ({
  id,
  course_code: data.course_code ?? '',
  course_name: data.course_name ?? '',
  description: data.description ?? '',
  department: data.department ?? '',
  semester_id: data.semester_id ?? '',
  semester_name: data.semester_name,
  lecturer_id: data.lecturer_id ?? '',
  lecturer_name: data.lecturer_name,
  enrolled_count: Number(data.enrolled_count ?? 0),
  status: data.status ?? 'active',
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export const loginAdmin = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  const adminRef = doc(db, 'admins', userCredential.user.uid);
  const directSnapshot = await getDoc(adminRef);

  let adminProfile: AdminProfile | null = null;

  if (directSnapshot.exists()) {
    adminProfile = mapAdminProfile(directSnapshot.id, directSnapshot.data());
  } else {
    const adminQuery = query(
      collection(db, 'admins'),
      where('email', '==', email.trim().toLowerCase())
    );
    const adminDocs = await getDocs(adminQuery);

    if (!adminDocs.empty) {
      const adminDoc = adminDocs.docs[0];
      adminProfile = mapAdminProfile(adminDoc.id, adminDoc.data());
    }
  }

  if (!adminProfile) {
    throw new Error('Admin profile not found. Create the Firestore admin record first.');
  }

  await assertRoleAccess(userCredential.user, 'admin', adminProfile.role);

  return adminProfile;
};

export const logoutAdmin = async () => {
  await signOut(auth);
};

export const getAdminDashboardData = async () => {
  const [studentsSnapshot, lecturersSnapshot, coursesSnapshot, semesters] =
    await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'lecturers')),
      getDocs(collection(db, 'courses')),
      getAllSemesters(),
    ]);

  const students = studentsSnapshot.docs.map((studentDoc) =>
    mapStudent(studentDoc.id, studentDoc.data())
  );
  const lecturers = lecturersSnapshot.docs.map((lecturerDoc) =>
    mapLecturer(lecturerDoc.id, lecturerDoc.data())
  );
  const courses = coursesSnapshot.docs.map((courseDoc) =>
    mapCourse(courseDoc.id, courseDoc.data())
  );
  const activeSemester = semesters.find((semester) => semester.is_active) ?? null;

  return {
    stats: {
      studentCount: students.length,
      lecturerCount: lecturers.length,
      courseCount: courses.length,
      semesterCount: semesters.length,
    },
    students,
    lecturers,
    courses,
    semesters,
    activeSemester,
  };
};

export const archiveSemester = async (semesterId: string) => {
  const semester = await getSemesterById(semesterId);
  const now = new Date().toISOString();
  const [coursesSnapshot, sessionsSnapshot, attendanceSnapshot, enrollmentsSnapshot] =
    await Promise.all([
      getDocs(query(collection(db, 'courses'), where('semester_id', '==', semesterId))),
      getDocs(query(collection(db, 'sessions'), where('semester_id', '==', semesterId))),
      getDocs(query(collection(db, 'attendance_logs'), where('semester_id', '==', semesterId))),
      getDocs(query(collection(db, 'course_enrollments'), where('semester_id', '==', semesterId))),
    ]);

  const courses = coursesSnapshot.docs.map((courseDoc) => mapCourse(courseDoc.id, courseDoc.data()));
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const totalSessionsPerCourse = new Map<string, number>();

  sessionsSnapshot.docs.forEach((sessionDoc) => {
    const data = sessionDoc.data();
    const courseId = data.course_id;
    totalSessionsPerCourse.set(courseId, (totalSessionsPerCourse.get(courseId) ?? 0) + 1);
  });

  const attendancePerStudentCourse = new Map<string, number>();
  attendanceSnapshot.docs.forEach((attendanceDoc) => {
    const data = attendanceDoc.data();
    const studentKey = data.student_uid ?? data.student_id;
    const courseId = data.course_id;

    if (!studentKey || !courseId) {
      return;
    }

    const key = `${studentKey}::${courseId}`;
    attendancePerStudentCourse.set(key, (attendancePerStudentCourse.get(key) ?? 0) + 1);
  });

  for (const enrollmentDoc of enrollmentsSnapshot.docs) {
    const enrollmentData = enrollmentDoc.data() as CourseEnrollment;

    if (enrollmentData.status && enrollmentData.status !== 'enrolled') {
      continue;
    }

    const course = courseMap.get(enrollmentData.course_id);

    if (!course) {
      continue;
    }

    const studentRef = doc(db, 'students', enrollmentData.student_id);
    const studentSnapshot = await getDoc(studentRef);

    if (!studentSnapshot.exists()) {
      continue;
    }

    const studentData = studentSnapshot.data();
    const currentEnrollments = Array.isArray(studentData.current_enrollments)
      ? (studentData.current_enrollments as StudentCurrentEnrollment[])
      : [];
    const attendanceHistory = Array.isArray(studentData.attendance_history)
      ? (studentData.attendance_history as AttendanceHistoryEntry[])
      : [];
    const attendedClasses =
      attendancePerStudentCourse.get(`${enrollmentData.student_id}::${course.id}`) ?? 0;
    const totalClasses = totalSessionsPerCourse.get(course.id) ?? 0;
    const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
    const historyEntry: AttendanceHistoryEntry = {
      courseId: course.id,
      courseCode: course.course_code,
      courseName: course.course_name,
      semesterId: semester.id,
      semesterName: semester.semester_name,
      department: course.department,
      lecturerId: course.lecturer_id,
      lecturerName: course.lecturer_name,
      attendedClasses,
      totalClasses,
      percentage,
      archivedAt: now,
    };
    const nextEnrollments = currentEnrollments.filter(
      (currentEnrollment) =>
        !(
          currentEnrollment.courseId === course.id &&
          currentEnrollment.semesterId === semester.id
        )
    );
    const nextLegacyEnrolledCourses = Array.isArray(studentData.enrolledCourses)
      ? studentData.enrolledCourses.filter((courseId: string) => courseId !== course.id)
      : [];

    await updateDoc(studentRef, {
      current_enrollments: nextEnrollments,
      attendance_history: [...attendanceHistory, historyEntry],
      enrolledCourses: nextLegacyEnrolledCourses,
      updatedAt: now,
    });

    await updateDoc(doc(db, 'course_enrollments', enrollmentDoc.id), {
      status: 'completed',
      attended_classes: attendedClasses,
      total_classes: totalClasses,
      percentage,
      completed_at: now,
      updated_at: now,
    });
  }

  for (const course of courses) {
    await updateDoc(doc(db, 'courses', course.id), {
      status: 'completed',
      updated_at: now,
    });
  }

  await updateDoc(doc(db, 'semesters', semesterId), {
    is_active: false,
    status: 'completed',
    completed_at: now,
    updated_at: now,
  });
};

export const createSemesterWithAutoArchive = async (input: CreateSemesterInput) => {
  const activeSemester = await getActiveSemester();

  if (activeSemester) {
    await archiveSemester(activeSemester.id);
  }

  return createSemester(input);
};
