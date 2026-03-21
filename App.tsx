import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookUser,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import StudentRegistration from './components/StudentRegistration';
import StudentQRGenerator from './components/StudentQRGenerator';
import LecturerScanner from './components/LecturerScanner';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminLogin from './components/Admin/AdminLogin';
import LecturerDashboard from './components/Lecturer/LecturerDashboard';
import CourseCreation from './components/Lecturer/CourseCreation';
import LecturerRegistration from './components/Lecturer/LecturerRegistration';
import MyCourses from './components/Lecturer/MyCourses';
import AttendanceHistory from './components/Student/AttendanceHistory';
import CourseEnrollment from './components/Student/CourseEnrollment';
import StudentDashboard from './components/Student/StudentDashboard';
import type { Course } from './types/course';
import type { AdminProfile, LecturerProfile, StudentProfile } from './types/user';

enum View {
  LANDING = 'LANDING',
  STUDENT_REGISTRATION = 'STUDENT_REGISTRATION',
  STUDENT_DASHBOARD = 'STUDENT_DASHBOARD',
  STUDENT_ENROLLMENT = 'STUDENT_ENROLLMENT',
  STUDENT_HISTORY = 'STUDENT_HISTORY',
  STUDENT_QR = 'STUDENT_QR',
  LECTURER_REGISTRATION = 'LECTURER_REGISTRATION',
  LECTURER_DASHBOARD = 'LECTURER_DASHBOARD',
  LECTURER_CREATE_COURSE = 'LECTURER_CREATE_COURSE',
  LECTURER_MY_COURSES = 'LECTURER_MY_COURSES',
  LECTURER_SCANNER = 'LECTURER_SCANNER',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}

const App: React.FC = () => {
  // Semester-aware app shell: new dashboards route into the preserved QR and scanner flows.
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [studentSession, setStudentSession] = useState<StudentProfile | null>(null);
  const [lecturerSession, setLecturerSession] = useState<LecturerProfile | null>(null);
  const [adminSession, setAdminSession] = useState<AdminProfile | null>(null);
  const [selectedStudentCourse, setSelectedStudentCourse] = useState<Course | null>(null);
  const [selectedLecturerCourse, setSelectedLecturerCourse] = useState<Course | null>(null);

  const goHome = () => setCurrentView(View.LANDING);

  const renderLanding = () => (
    <div className="min-h-[100dvh] relative flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob [animation-delay:2s]" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob [animation-delay:4s]" />

      <div className="z-10 w-full max-w-5xl">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-brand-500 to-accent-500 rounded-2xl mb-6 shadow-lg shadow-brand-500/30"
          >
            <ShieldCheck className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Omniattend
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Semester-based attendance for admins, lecturers, and students with QR scanning and fingerprint verification preserved.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => setCurrentView(View.STUDENT_DASHBOARD)}
            className="glass-panel hover:bg-white/5 p-6 rounded-3xl transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent-500/20 text-accent-300 flex items-center justify-center mb-5">
              <BookUser className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Student</h2>
            <p className="text-slate-400 text-sm mb-6">
              Log in, enroll in semester courses, generate QR codes, and review attendance history.
            </p>
            <span className="inline-flex items-center gap-2 text-accent-300">
              Open portal
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <button
            onClick={() => setCurrentView(View.LECTURER_DASHBOARD)}
            className="glass-panel hover:bg-white/5 p-6 rounded-3xl transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand-500/20 text-brand-300 flex items-center justify-center mb-5">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lecturer</h2>
            <p className="text-slate-400 text-sm mb-6">
              Create semester courses, launch attendance sessions, and keep QR and biometric scanning in one flow.
            </p>
            <span className="inline-flex items-center gap-2 text-brand-300">
              Open portal
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <button
            onClick={() => setCurrentView(View.ADMIN_LOGIN)}
            className="glass-panel hover:bg-white/5 p-6 rounded-3xl transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-5">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin</h2>
            <p className="text-slate-400 text-sm mb-6">
              Create or end semesters, inspect system-wide stats, and archive attendance into historical records.
            </p>
            <span className="inline-flex items-center gap-2 text-emerald-300">
              Open portal
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <button
            onClick={() => setCurrentView(View.STUDENT_REGISTRATION)}
            className="text-accent-300 hover:text-accent-200 underline"
          >
            Register as a student
          </button>
          <button
            onClick={() => setCurrentView(View.LECTURER_REGISTRATION)}
            className="text-brand-300 hover:text-brand-200 underline"
          >
            Register as a lecturer
          </button>
        </div>
      </div>
    </div>
  );

  switch (currentView) {
    case View.STUDENT_REGISTRATION:
      return (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <StudentRegistration
            onBack={goHome}
            onRegistrationSuccess={() => setCurrentView(View.STUDENT_DASHBOARD)}
          />
        </div>
      );

    case View.STUDENT_DASHBOARD:
      return (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <StudentDashboard
            student={studentSession}
            onStudentChange={setStudentSession}
            onBack={goHome}
            onOpenEnrollment={() => setCurrentView(View.STUDENT_ENROLLMENT)}
            onOpenHistory={() => setCurrentView(View.STUDENT_HISTORY)}
            onOpenQR={(course) => {
              setSelectedStudentCourse(course);
              setCurrentView(View.STUDENT_QR);
            }}
          />
        </div>
      );

    case View.STUDENT_ENROLLMENT:
      return studentSession ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <CourseEnrollment
            student={studentSession}
            onStudentChange={setStudentSession}
            onBack={() => setCurrentView(View.STUDENT_DASHBOARD)}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <StudentDashboard
            student={studentSession}
            onStudentChange={setStudentSession}
            onBack={goHome}
            onOpenEnrollment={() => setCurrentView(View.STUDENT_ENROLLMENT)}
            onOpenHistory={() => setCurrentView(View.STUDENT_HISTORY)}
            onOpenQR={(course) => {
              setSelectedStudentCourse(course);
              setCurrentView(View.STUDENT_QR);
            }}
          />
        </div>
      );

    case View.STUDENT_HISTORY:
      return studentSession ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <AttendanceHistory
            student={studentSession}
            onBack={() => setCurrentView(View.STUDENT_DASHBOARD)}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <StudentDashboard
            student={studentSession}
            onStudentChange={setStudentSession}
            onBack={goHome}
            onOpenEnrollment={() => setCurrentView(View.STUDENT_ENROLLMENT)}
            onOpenHistory={() => setCurrentView(View.STUDENT_HISTORY)}
            onOpenQR={(course) => {
              setSelectedStudentCourse(course);
              setCurrentView(View.STUDENT_QR);
            }}
          />
        </div>
      );

    case View.STUDENT_QR:
      return studentSession && selectedStudentCourse ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <StudentQRGenerator
            student={studentSession}
            course={selectedStudentCourse}
            onBack={() => setCurrentView(View.STUDENT_DASHBOARD)}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <StudentDashboard
            student={studentSession}
            onStudentChange={setStudentSession}
            onBack={goHome}
            onOpenEnrollment={() => setCurrentView(View.STUDENT_ENROLLMENT)}
            onOpenHistory={() => setCurrentView(View.STUDENT_HISTORY)}
            onOpenQR={(course) => {
              setSelectedStudentCourse(course);
              setCurrentView(View.STUDENT_QR);
            }}
          />
        </div>
      );

    case View.LECTURER_REGISTRATION:
      return (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <LecturerRegistration
            onBack={goHome}
            onRegistrationSuccess={(lecturer) => {
              setLecturerSession(lecturer);
              setCurrentView(View.LECTURER_DASHBOARD);
            }}
          />
        </div>
      );

    case View.LECTURER_DASHBOARD:
      return (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <LecturerDashboard
            lecturer={lecturerSession}
            onLecturerChange={setLecturerSession}
            onBack={goHome}
            onCreateCourse={() => setCurrentView(View.LECTURER_CREATE_COURSE)}
            onOpenMyCourses={() => setCurrentView(View.LECTURER_MY_COURSES)}
          />
        </div>
      );

    case View.LECTURER_CREATE_COURSE:
      return lecturerSession ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <CourseCreation
            lecturer={lecturerSession}
            onLecturerChange={setLecturerSession}
            onBack={() => setCurrentView(View.LECTURER_DASHBOARD)}
            onCreated={() => setCurrentView(View.LECTURER_MY_COURSES)}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <LecturerDashboard
            lecturer={lecturerSession}
            onLecturerChange={setLecturerSession}
            onBack={goHome}
            onCreateCourse={() => setCurrentView(View.LECTURER_CREATE_COURSE)}
            onOpenMyCourses={() => setCurrentView(View.LECTURER_MY_COURSES)}
          />
        </div>
      );

    case View.LECTURER_MY_COURSES:
      return lecturerSession ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <MyCourses
            lecturer={lecturerSession}
            onBack={() => setCurrentView(View.LECTURER_DASHBOARD)}
            onOpenCreateCourse={() => setCurrentView(View.LECTURER_CREATE_COURSE)}
            onOpenScanner={(course) => {
              setSelectedLecturerCourse(course);
              setCurrentView(View.LECTURER_SCANNER);
            }}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <LecturerDashboard
            lecturer={lecturerSession}
            onLecturerChange={setLecturerSession}
            onBack={goHome}
            onCreateCourse={() => setCurrentView(View.LECTURER_CREATE_COURSE)}
            onOpenMyCourses={() => setCurrentView(View.LECTURER_MY_COURSES)}
          />
        </div>
      );

    case View.LECTURER_SCANNER:
      return lecturerSession && selectedLecturerCourse ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <LecturerScanner
            onBack={() => setCurrentView(View.LECTURER_MY_COURSES)}
            initialLecturer={lecturerSession}
            initialCourse={selectedLecturerCourse}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <LecturerDashboard
            lecturer={lecturerSession}
            onLecturerChange={setLecturerSession}
            onBack={goHome}
            onCreateCourse={() => setCurrentView(View.LECTURER_CREATE_COURSE)}
            onOpenMyCourses={() => setCurrentView(View.LECTURER_MY_COURSES)}
          />
        </div>
      );

    case View.ADMIN_LOGIN:
      return (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <AdminLogin
            onBack={goHome}
            onLogin={(admin) => {
              setAdminSession(admin);
              setCurrentView(View.ADMIN_DASHBOARD);
            }}
          />
        </div>
      );

    case View.ADMIN_DASHBOARD:
      return adminSession ? (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <AdminDashboard
            admin={adminSession}
            onBack={goHome}
            onLogout={() => {
              setAdminSession(null);
              setCurrentView(View.ADMIN_LOGIN);
            }}
          />
        </div>
      ) : (
        <div className="bg-dark-bg min-h-[100dvh] font-sans">
          <AdminLogin
            onBack={goHome}
            onLogin={(admin) => {
              setAdminSession(admin);
              setCurrentView(View.ADMIN_DASHBOARD);
            }}
          />
        </div>
      );

    default:
      return <div className="bg-dark-bg min-h-[100dvh] font-sans">{renderLanding()}</div>;
  }
};

export default App;
