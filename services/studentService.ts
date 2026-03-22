import {
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebaseClient';
import { assertRoleAccess } from './roleService';
import type { AttendanceHistoryEntry, StudentCurrentEnrollment } from '../types/enrollment';
import type { StudentProfile } from '../types/user';

export interface RegisterStudentInput {
  firstName: string;
  lastName: string;
  matricNumber: string;
  email: string;
  phoneNumber?: string;
  password: string;
  department: string;
  level: string;
}

const mapStudentProfile = (id: string, data: Record<string, any>): StudentProfile => ({
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
  current_enrollments: Array.isArray(data.current_enrollments)
    ? (data.current_enrollments as StudentCurrentEnrollment[])
    : [],
  attendance_history: Array.isArray(data.attendance_history)
    ? (data.attendance_history as AttendanceHistoryEntry[])
    : [],
  role: 'student',
  isActive: data.isActive ?? true,
  createdAt: data.createdAt ?? new Date().toISOString(),
  updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
});

const getStudentByMatricNumber = async (matricNumber: string) => {
  const studentsRef = collection(db, 'students');
  const normalized = matricNumber.trim().toUpperCase();
  const studentQuery = query(studentsRef, where('matricNumber', '==', normalized));
  const snapshot = await getDocs(studentQuery);

  if (snapshot.empty) {
    throw new Error('Matric number not found.');
  }

  const studentDoc = snapshot.docs[0];
  return mapStudentProfile(studentDoc.id, studentDoc.data());
};

export const getStudentProfile = async (uid: string) => {
  const studentRef = doc(db, 'students', uid);
  const snapshot = await getDoc(studentRef);

  if (!snapshot.exists()) {
    throw new Error('Student profile not found.');
  }

  return mapStudentProfile(snapshot.id, snapshot.data());
};

export const loginStudent = async (matricNumber: string, password: string) => {
  const studentSeed = await getStudentByMatricNumber(matricNumber);
  const userCredential = await signInWithEmailAndPassword(auth, studentSeed.email, password);
  const profile = await getStudentProfile(userCredential.user.uid);

  await assertRoleAccess(userCredential.user, 'student', profile.role);

  return profile;
};

export const registerStudent = async (input: RegisterStudentInput) => {
  const existingStudent = await getDocs(
    query(
      collection(db, 'students'),
      where('matricNumber', '==', input.matricNumber.trim().toUpperCase())
    )
  );

  if (!existingStudent.empty) {
    throw new Error('Matric number already registered.');
  }

  const userCredential: UserCredential = await createUserWithEmailAndPassword(
    auth,
    input.email.trim().toLowerCase(),
    input.password
  );

  const now = new Date().toISOString();
  const studentRecord: StudentProfile = {
    uid: userCredential.user.uid,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    matricNumber: input.matricNumber.trim().toUpperCase(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber?.trim() ?? '',
    department: input.department.trim(),
    level: input.level.trim(),
    enrolledCourses: [],
    current_enrollments: [],
    attendance_history: [],
    role: 'student',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'students', userCredential.user.uid), studentRecord);
  await signOut(auth);

  return studentRecord;
};

export const refreshStudentProfile = async (uid: string) => getStudentProfile(uid);

export const logoutStudent = async () => {
  await signOut(auth);
};
