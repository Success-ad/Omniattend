import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import type { Course, CreateCourseInput } from '../types/course';

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

export const getCourseById = async (courseId: string) => {
  const snapshot = await getDoc(doc(db, 'courses', courseId));

  if (!snapshot.exists()) {
    throw new Error('Course not found.');
  }

  return mapCourse(snapshot.id, snapshot.data());
};

export const getCoursesBySemester = async (semesterId: string) => {
  const semesterQuery = query(
    collection(db, 'courses'),
    where('semester_id', '==', semesterId)
  );
  const snapshot = await getDocs(semesterQuery);
  const courses = snapshot.docs.map((courseDoc) => mapCourse(courseDoc.id, courseDoc.data()));

  return courses.sort((left, right) =>
    left.course_code.localeCompare(right.course_code)
  );
};

export const getCoursesByDepartment = async (semesterId: string, department: string) => {
  const allCourses = await getCoursesBySemester(semesterId);
  const normalizedDepartment = department.trim().toLowerCase();

  return allCourses.filter(
    (course) => course.department.trim().toLowerCase() === normalizedDepartment
  );
};

export const getDepartmentsForSemester = async (semesterId: string) => {
  const courses = await getCoursesBySemester(semesterId);
  return Array.from(new Set(courses.map((course) => course.department))).sort((a, b) =>
    a.localeCompare(b)
  );
};

export const getCoursesForLecturer = async (lecturerId: string, semesterId?: string | null) => {
  const lecturerQuery = query(
    collection(db, 'courses'),
    where('lecturer_id', '==', lecturerId)
  );
  const snapshot = await getDocs(lecturerQuery);
  const courses = snapshot.docs.map((courseDoc) => mapCourse(courseDoc.id, courseDoc.data()));
  const filteredCourses = semesterId
    ? courses.filter((course) => course.semester_id === semesterId)
    : courses;

  return filteredCourses.sort((left, right) =>
    left.course_code.localeCompare(right.course_code)
  );
};

export const createCourse = async (input: CreateCourseInput) => {
  const now = new Date().toISOString();
  const normalizedCode = input.course_code.trim().toUpperCase();
  const normalizedDepartment = input.department.trim();

  const duplicateQuery = query(
    collection(db, 'courses'),
    where('semester_id', '==', input.semester_id)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  const duplicateCourse = duplicateSnapshot.docs.find((courseDoc) => {
    const data = courseDoc.data();
    return (data.course_code ?? '').toUpperCase() === normalizedCode;
  });

  if (duplicateCourse) {
    throw new Error('A course with this code already exists in the selected semester.');
  }

  const courseRecord = {
    course_code: normalizedCode,
    course_name: input.course_name.trim(),
    description: input.description.trim(),
    department: normalizedDepartment,
    semester_id: input.semester_id,
    semester_name: input.semester_name,
    lecturer_id: input.lecturer_id,
    lecturer_name: input.lecturer_name,
    enrolled_count: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  const docRef = await addDoc(collection(db, 'courses'), courseRecord);

  await updateDoc(doc(db, 'lecturers', input.lecturer_id), {
    createdCourses: arrayUnion(docRef.id),
    updatedAt: now,
  });

  return {
    id: docRef.id,
    ...courseRecord,
  } as Course;
};
