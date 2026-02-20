import { db } from './firebaseClient';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

const auth = getAuth();

export const loginLecturer = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const logoutLecturer = async () => {
  await signOut(auth);
};

// Save attendance record
export const saveAttendance = async (
  sessionId: string, 
  studentId: string, 
  studentName?: string, 
  nonce?: string
) => {
  return await addDoc(collection(db, 'attendance_logs'), {
    class_id: sessionId,
    student_id: studentId,
    student_name: studentName || null,
    nonce: nonce || `AUTO-${Date.now()}`,
    timestamp: new Date().toISOString()
  });
};
// Add a new lecturer (for testing purposes)

// Get session history for a course
export const getSessionHistory = async (courseId: string) => {
  const q = query(
    collection(db, 'sessions'),
    where('course_id', '==', courseId),
    orderBy('created_at', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Create new session
export const createSession = async (sessionData: {
  session_id: string;
  course_id: string;
  name: string;
  description: string;
  date: string;
  created_at: string;
}) => {
  return await addDoc(collection(db, 'sessions'), sessionData);
};