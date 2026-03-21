import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  History,
  Loader2,
  LogOut,
  QrCode,
  User,
} from 'lucide-react';
import SemesterCard from '../Shared/SemesterCard';
import { getCoursesBySemester } from '../../services/courseService';
import { getActiveSemester } from '../../services/semesterService';
import { loginStudent, logoutStudent } from '../../services/studentService';
import type { Course } from '../../types/course';
import type { Semester } from '../../types/semester';
import type { StudentProfile } from '../../types/user';

interface StudentDashboardProps {
  student: StudentProfile | null;
  onStudentChange: (student: StudentProfile | null) => void;
  onBack: () => void;
  onOpenEnrollment: () => void;
  onOpenHistory: () => void;
  onOpenQR: (course: Course) => void;
}

const buildFallbackCourse = (
  enrollment: StudentProfile['current_enrollments'][number]
): Course => ({
  id: enrollment.courseId,
  course_code: enrollment.courseCode,
  course_name: enrollment.courseName,
  description: '',
  department: enrollment.department,
  semester_id: enrollment.semesterId,
  semester_name: enrollment.semesterName,
  lecturer_id: enrollment.lecturerId,
  lecturer_name: enrollment.lecturerName,
  enrolled_count: 0,
  status: 'active',
});

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onStudentChange,
  onBack,
  onOpenEnrollment,
  onOpenHistory,
  onOpenQR,
}) => {
  const [matricNumber, setMatricNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      if (!student) {
        return;
      }

      setLoadingDashboard(true);

      try {
        const semester = await getActiveSemester();

        if (!mounted) {
          return;
        }

        setActiveSemester(semester);

        if (semester) {
          const semesterCourses = await getCoursesBySemester(semester.id);
          if (mounted) {
            setActiveCourses(semesterCourses);
          }
        } else if (mounted) {
          setActiveCourses([]);
        }
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError.message || 'Unable to load the student dashboard.');
        }
      } finally {
        if (mounted) {
          setLoadingDashboard(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [student]);

  const enrolledCourses = useMemo(() => {
    if (!student) {
      return [];
    }

    const semesterSpecific = activeSemester
      ? student.current_enrollments.filter(
          (enrollment) => enrollment.semesterId === activeSemester.id
        )
      : student.current_enrollments;

    return semesterSpecific.map((enrollment) => {
      const matchingCourse = activeCourses.find((course) => course.id === enrollment.courseId);
      return matchingCourse ?? buildFallbackCourse(enrollment);
    });
  }, [activeCourses, activeSemester, student]);

  const pastSemesters = useMemo(() => {
    if (!student) {
      return [];
    }

    const semesterMap = new Map<string, { id: string; name: string; courseCount: number }>();
    student.attendance_history.forEach((entry) => {
      const existing = semesterMap.get(entry.semesterId);
      if (existing) {
        existing.courseCount += 1;
      } else {
        semesterMap.set(entry.semesterId, {
          id: entry.semesterId,
          name: entry.semesterName,
          courseCount: 1,
        });
      }
    });

    return Array.from(semesterMap.values());
  }, [student]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const profile = await loginStudent(matricNumber, password);
      onStudentChange(profile);
      setPassword('');
    } catch (loginError: any) {
      setError(loginError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutStudent();
    onStudentChange(null);
    setMatricNumber('');
    setPassword('');
    setActiveSemester(null);
    setActiveCourses([]);
  };

  if (!student) {
    return (
      <div className="min-h-[100dvh] bg-dark-bg p-6 flex items-center justify-center">
        <div className="w-full max-w-md glass-panel rounded-[2rem] p-8 border border-white/10">
          <button
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center mb-8">
            <div className="w-18 h-18 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-accent-500 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <User className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Student Portal</h2>
            <p className="text-slate-400">Sign in with your matric number and password.</p>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                Matric Number
              </label>
              <input
                value={matricNumber}
                onChange={(event) => setMatricNumber(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white outline-none focus:border-accent-500"
                placeholder="20/2726"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white outline-none focus:border-accent-500"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-accent-500 to-brand-500 py-4 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Signing In...' : 'Open Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">Welcome, {student.firstName}</h1>
            <p className="text-slate-400 mt-2">
              {student.department} • Level {student.level} • {student.matricNumber}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {loadingDashboard ? (
          <div className="glass-panel rounded-3xl p-8 text-slate-300 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading student dashboard...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <SemesterCard
                semester={activeSemester}
                subtitle="Browse the active semester, manage your enrollments, and generate QR codes only for the courses you currently hold."
                actionLabel={activeSemester ? 'Browse Courses' : undefined}
                onAction={activeSemester ? onOpenEnrollment : undefined}
              />

              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-white">Enrolled Courses</h2>
                    <p className="text-slate-400 text-sm">
                      Only enrolled courses can generate attendance QR codes.
                    </p>
                  </div>
                  <button
                    onClick={onOpenEnrollment}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white bg-white/5 hover:bg-white/10"
                  >
                    Manage Enrollments
                  </button>
                </div>

                <div className="space-y-3">
                  {enrolledCourses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                      No current course enrollments yet. Open the semester browser to add or drop courses.
                    </div>
                  ) : (
                    enrolledCourses.map((course, index) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm text-brand-300 font-mono mb-1">{course.course_code}</p>
                          <h3 className="text-lg font-semibold text-white">{course.course_name}</h3>
                          <p className="text-sm text-slate-400 mt-1">
                            {course.department}
                            {course.lecturer_name ? ` • ${course.lecturer_name}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => onOpenQR(course)}
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 text-white font-medium"
                        >
                          <QrCode className="w-4 h-4" />
                          Generate QR
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Attendance History</h2>
                    <p className="text-slate-400 text-sm">
                      Review simple semester-by-semester attendance summaries.
                    </p>
                  </div>
                  <button
                    onClick={onOpenHistory}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white"
                  >
                    <History className="w-4 h-4" />
                    Open History
                  </button>
                </div>

                <div className="space-y-3">
                  {pastSemesters.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                      History will appear here once a semester has been archived by the admin.
                    </div>
                  ) : (
                    pastSemesters.map((semester) => (
                      <div
                        key={semester.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-white font-semibold">{semester.name}</p>
                          <p className="text-slate-400 text-sm">
                            {semester.courseCount} course summary
                            {semester.courseCount === 1 ? '' : 'ies'}
                          </p>
                        </div>
                        <CalendarDays className="w-5 h-5 text-brand-400" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">Quick Summary</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-slate-400 text-sm mb-2">Current Courses</p>
                    <p className="text-3xl font-bold text-white">{enrolledCourses.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-slate-400 text-sm mb-2">Archived Courses</p>
                    <p className="text-3xl font-bold text-white">{student.attendance_history.length}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-brand-500/10 border border-brand-500/15 p-4 text-sm text-brand-100">
                  QR codes are tied to your live enrollments, so dropping a course immediately removes QR access for that course.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
