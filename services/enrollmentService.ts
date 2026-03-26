import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebaseClient';
import type { Course } from '../types/course';
import type { CourseEnrollment, StudentCurrentEnrollment } from '../types/enrollment';
import type { Semester } from '../types/semester';
import type { StudentProfile } from '../types/user';

const buildEnrollmentSnapshot = (
  student: StudentProfile,
  course: Course,
  semester: Semester,
  enrolledAt: string
): CourseEnrollment => ({
  id: `${student.uid}_${course.id}_${semester.id}`,
  student_id: student.uid,
  student_name: student.fullName,
  course_id: course.id,
  course_code: course.course_code,
  course_name: course.course_name,
  semester_id: semester.id,
  semester_name: semester.semester_name,
  department: course.department,
  lecturer_id: course.lecturer_id,
  lecturer_name: course.lecturer_name,
  status: 'enrolled',
  enrolled_at: enrolledAt,
});

const buildStudentEnrollment = (
  course: Course,
  semester: Semester,
  enrolledAt: string
): StudentCurrentEnrollment => ({
  courseId: course.id,
  courseCode: course.course_code,
  courseName: course.course_name,
  semesterId: semester.id,
  semesterName: semester.semester_name,
  department: course.department,
  lecturerId: course.lecturer_id,
  lecturerName: course.lecturer_name,
  enrolledAt,
  status: 'enrolled',
});

export const enrollInCourse = async (
  student: StudentProfile,
  course: Course,
  semester: Semester
) => {
  const studentRef = doc(db, 'students', student.uid);
  const courseRef = doc(db, 'courses', course.id);
  const enrollmentId = `${student.uid}_${course.id}_${semester.id}`;
  const enrollmentRef = doc(db, 'course_enrollments', enrollmentId);

  await runTransaction(db, async (transaction) => {
    const studentSnapshot = await transaction.get(studentRef);
    const courseSnapshot = await transaction.get(courseRef);
    const enrollmentSnapshot = await transaction.get(enrollmentRef);

    if (!studentSnapshot.exists()) {
      throw new Error('Student profile not found.');
    }

    if (!courseSnapshot.exists()) {
      throw new Error('Course not found.');
    }

    const studentData = studentSnapshot.data();
    const currentEnrollments = Array.isArray(studentData.current_enrollments)
      ? studentData.current_enrollments
      : [];
    const alreadyEnrolled = currentEnrollments.some(
      (enrollment: StudentCurrentEnrollment) => enrollment.courseId === course.id
    );

    if (
      alreadyEnrolled ||
      (enrollmentSnapshot.exists() && enrollmentSnapshot.data().status === 'enrolled')
    ) {
      throw new Error('Student is already enrolled in this course.');
    }

    const enrolledAt = new Date().toISOString();
    const studentEnrollment = buildStudentEnrollment(course, semester, enrolledAt);
    const courseEnrollment = buildEnrollmentSnapshot(student, course, semester, enrolledAt);
    const enrolledCourses = Array.isArray(studentData.enrolledCourses)
      ? studentData.enrolledCourses
      : [];

    transaction.set(enrollmentRef, {
      ...courseEnrollment,
      updated_at: enrolledAt,
    });
    transaction.update(studentRef, {
      current_enrollments: [...currentEnrollments, studentEnrollment],
      enrolledCourses: Array.from(new Set([...enrolledCourses, course.id])),
      updatedAt: enrolledAt,
    });
    transaction.update(courseRef, {
      enrolled_count: Number(courseSnapshot.data().enrolled_count ?? 0) + 1,
      updated_at: enrolledAt,
    });
  });
};

export const dropCourse = async (
  student: StudentProfile,
  course: Course,
  semesterId: string
) => {
  const studentRef = doc(db, 'students', student.uid);
  const courseRef = doc(db, 'courses', course.id);
  const enrollmentId = `${student.uid}_${course.id}_${semesterId}`;
  const enrollmentRef = doc(db, 'course_enrollments', enrollmentId);

  await runTransaction(db, async (transaction) => {
    const studentSnapshot = await transaction.get(studentRef);
    const courseSnapshot = await transaction.get(courseRef);
    const enrollmentSnapshot = await transaction.get(enrollmentRef);

    if (!studentSnapshot.exists() || !courseSnapshot.exists()) {
      throw new Error('Unable to drop this course because the record no longer exists.');
    }

    const studentData = studentSnapshot.data();
    const currentEnrollments = Array.isArray(studentData.current_enrollments)
      ? studentData.current_enrollments
      : [];
    const nextEnrollments = currentEnrollments.filter(
      (enrollment: StudentCurrentEnrollment) => enrollment.courseId !== course.id
    );
    const enrolledCourses = Array.isArray(studentData.enrolledCourses)
      ? studentData.enrolledCourses
      : [];
    const nextCourseIds = enrolledCourses.filter((courseId: string) => courseId !== course.id);
    const now = new Date().toISOString();

    if (enrollmentSnapshot.exists()) {
      transaction.update(enrollmentRef, {
        status: 'dropped',
        dropped_at: now,
        updated_at: now,
      });
    }

    transaction.update(studentRef, {
      current_enrollments: nextEnrollments,
      enrolledCourses: nextCourseIds,
      updatedAt: now,
    });
    transaction.update(courseRef, {
      enrolled_count: Math.max(Number(courseSnapshot.data().enrolled_count ?? 0) - 1, 0),
      updated_at: now,
    });
  });
};

export const getEnrollmentDoc = async (
  studentId: string,
  courseId: string,
  semesterId: string
) => {
  const snapshot = await getDoc(doc(db, 'course_enrollments', `${studentId}_${courseId}_${semesterId}`));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as CourseEnrollment;
};
