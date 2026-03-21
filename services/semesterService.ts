import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import type { CreateSemesterInput, Semester } from '../types/semester';

const mapSemester = (id: string, data: Record<string, any>): Semester => ({
  id,
  semester_name: data.semester_name ?? '',
  start_date: data.start_date ?? '',
  end_date: data.end_date ?? '',
  is_active: data.is_active ?? false,
  status: data.status ?? 'upcoming',
  created_at: data.created_at,
  updated_at: data.updated_at,
  completed_at: data.completed_at ?? null,
});

export const getSemesterById = async (semesterId: string) => {
  const snapshot = await getDoc(doc(db, 'semesters', semesterId));

  if (!snapshot.exists()) {
    throw new Error('Semester not found.');
  }

  return mapSemester(snapshot.id, snapshot.data());
};

export const getAllSemesters = async () => {
  const snapshot = await getDocs(collection(db, 'semesters'));
  const semesters = snapshot.docs.map((semesterDoc) =>
    mapSemester(semesterDoc.id, semesterDoc.data())
  );

  return semesters.sort((left, right) => {
    const leftDate = Date.parse(left.start_date || '') || 0;
    const rightDate = Date.parse(right.start_date || '') || 0;
    return rightDate - leftDate;
  });
};

export const getActiveSemester = async () => {
  const activeSemesterQuery = query(
    collection(db, 'semesters'),
    where('is_active', '==', true)
  );
  const snapshot = await getDocs(activeSemesterQuery);

  if (snapshot.empty) {
    return null;
  }

  const semesterDoc = snapshot.docs[0];
  return mapSemester(semesterDoc.id, semesterDoc.data());
};

export const createSemester = async (input: CreateSemesterInput) => {
  const now = new Date().toISOString();
  const semesterRecord = {
    semester_name: input.semester_name.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    is_active: true,
    status: 'active',
    created_at: now,
    updated_at: now,
    completed_at: null,
  };

  const docRef = await addDoc(collection(db, 'semesters'), semesterRecord);
  return {
    id: docRef.id,
    ...semesterRecord,
  } as Semester;
};

export const endSemesterRecord = async (semesterId: string) => {
  await updateDoc(doc(db, 'semesters', semesterId), {
    is_active: false,
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};
