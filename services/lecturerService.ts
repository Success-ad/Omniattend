import {
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
import type { LecturerProfile } from '../types/user';

export interface RegisterLecturerInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  department: string;
  phoneNumber: string;
}

const mapLecturerProfile = (id: string, data: Record<string, any>): LecturerProfile => ({
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
  createdAt: data.createdAt ?? new Date().toISOString(),
  updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
});

export const getLecturerProfile = async (uid: string) => {
  const lecturerRef = doc(db, 'lecturers', uid);
  const snapshot = await getDoc(lecturerRef);

  if (snapshot.exists()) {
    return mapLecturerProfile(snapshot.id, snapshot.data());
  }

  const lecturerQuery = query(collection(db, 'lecturers'), where('uid', '==', uid));
  const lecturerDocs = await getDocs(lecturerQuery);

  if (lecturerDocs.empty) {
    throw new Error('Lecturer profile not found.');
  }

  const lecturerDoc = lecturerDocs.docs[0];
  return mapLecturerProfile(lecturerDoc.id, lecturerDoc.data());
};

export const registerLecturer = async (input: RegisterLecturerInput) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    input.email.trim().toLowerCase(),
    input.password
  );

  const now = new Date().toISOString();
  const lecturerRecord: LecturerProfile = {
    uid: userCredential.user.uid,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.department.trim(),
    phoneNumber: input.phoneNumber.trim(),
    createdCourses: [],
    role: 'lecturer',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'lecturers', userCredential.user.uid), lecturerRecord);

  return lecturerRecord;
};

export const loginLecturer = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  const profile = await getLecturerProfile(userCredential.user.uid);

  await assertRoleAccess(userCredential.user, 'lecturer', profile.role);

  return profile;
};

export const logoutLecturer = async () => {
  await signOut(auth);
};
