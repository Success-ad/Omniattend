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

// Get session history for a course
export const getSessionHistory = async (courseId: string) => {
  try {
    // Query server-side for sessions matching courseId (no orderBy to avoid composite index requirement)
    const q = query(collection(db, 'sessions'), where('course_id', '==', courseId));
    const snapshot = await getDocs(q);

    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort client-side by created_at (supports ISO string or Firestore Timestamp)
    sessions.sort((a: any, b: any) => {
      const toMillis = (v: any) => {
        if (!v) return 0;
        if (typeof v === 'string') return Date.parse(v) || 0;
        // Firestore Timestamp has `seconds` field
        if (v.seconds) return v.seconds * 1000 + (v.nanoseconds ? Math.floor(v.nanoseconds / 1e6) : 0);
        return 0;
      };
      return toMillis(b.created_at) - toMillis(a.created_at);
    });

    return sessions;
  } catch (err) {
    console.warn('Failed to load session history', err);
    return [];
  }
};

// Create new session
export const getAttendanceForSession = async (sessionId: string) => {
  try {
    const q = query(collection(db, 'attendance_logs'), where('class_id', '==', sessionId));
    const snapshot = await getDocs(q);

    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort client-side by timestamp (supports ISO string or Firestore Timestamp)
    records.sort((a: any, b: any) => {
      const toMillis = (v: any) => {
        if (!v) return 0;
        if (typeof v === 'string') return Date.parse(v) || 0;
        if (v.seconds) return v.seconds * 1000 + (v.nanoseconds ? Math.floor(v.nanoseconds / 1e6) : 0);
        return 0;
      };
      return toMillis(b.timestamp) - toMillis(a.timestamp);
    });

    return records;
  } catch (err) {
    console.warn('Failed to load attendance for session', err);
    return [];
  }
};

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