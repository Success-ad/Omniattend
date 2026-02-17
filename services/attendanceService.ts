import { db } from './firebaseClient';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

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
await addDoc(collection(db, 'lecturers'), {
  firstName: "Sarah",
  lastName: "Johnson",
  lecturerId: "LEC-001",
  email: "lecturer@university.edu",
  password: "123456",
  department: "Computer Science",
  courses: ["CS-404", "CS-302"],
  createdAt: new Date().toISOString(),
  isActive: true
});

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