import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Loader2, LogOut, PlusCircle } from 'lucide-react';
import SemesterCard from '../Shared/SemesterCard';
import { getCoursesForLecturer } from '../../services/courseService';
import { loginLecturer, logoutLecturer } from '../../services/lecturerService';
import { getActiveSemester } from '../../services/semesterService';
import type { Course } from '../../types/course';
import type { Semester } from '../../types/semester';
import type { LecturerProfile } from '../../types/user';

interface LecturerDashboardProps {
  lecturer: LecturerProfile | null;
  onLecturerChange: (lecturer: LecturerProfile | null) => void;
  onBack: () => void;
  onCreateCourse: () => void;
  onOpenMyCourses: () => void;
}

const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  lecturer,
  onLecturerChange,
  onBack,
  onCreateCourse,
  onOpenMyCourses,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      if (!lecturer) {
        return;
      }

      setDashboardLoading(true);
      setError('');

      try {
        const semester = await getActiveSemester();

        if (!mounted) {
          return;
        }

        setActiveSemester(semester);

        if (semester) {
          const lecturerCourses = await getCoursesForLecturer(lecturer.uid, semester.id);
          if (mounted) {
            setCourses(lecturerCourses);
          }
        } else if (mounted) {
          setCourses([]);
        }
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError.message || 'Unable to load the lecturer dashboard.');
        }
      } finally {
        if (mounted) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [lecturer?.uid]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const profile = await loginLecturer(email, password);
      onLecturerChange(profile);
      setPassword('');
    } catch (loginError: any) {
      setError(loginError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutLecturer();
    onLecturerChange(null);
    setEmail('');
    setPassword('');
    setActiveSemester(null);
    setCourses([]);
  };

  if (!lecturer) {
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
            <h1 className="text-3xl font-bold text-white mb-2">Lecturer Portal</h1>
            <p className="text-slate-400">
              Sign in to create courses, view your semester load, and access the scanner.
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Lecturer email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-4 font-semibold text-white disabled:opacity-60"
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
            <h1 className="text-3xl font-bold text-white">Lecturer Dashboard</h1>
            <p className="text-slate-400 mt-2">
              {lecturer.fullName} • {lecturer.department}
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

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {dashboardLoading ? (
          <div className="glass-panel rounded-3xl p-8 flex items-center gap-3 text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading lecturer dashboard...
          </div>
        ) : (
          <div className="space-y-6">
            <SemesterCard
              semester={activeSemester}
              subtitle="Create courses inside the active semester. Your department is used as the default but you can still support cross-department courses."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <p className="text-slate-400 text-sm mb-2">Active Courses</p>
                <p className="text-3xl font-bold text-white">{courses.length}</p>
              </div>
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <p className="text-slate-400 text-sm mb-2">Created Course IDs</p>
                <p className="text-3xl font-bold text-white">{lecturer.createdCourses.length}</p>
              </div>
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <p className="text-slate-400 text-sm mb-2">Department</p>
                <p className="text-2xl font-bold text-white">{lecturer.department}</p>
              </div>
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <p className="text-slate-400 text-sm mb-2">Semester Status</p>
                <p className="text-2xl font-bold text-white">
                  {activeSemester ? 'Open' : 'Waiting'}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-5">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={onCreateCourse}
                    className="w-full rounded-3xl bg-gradient-to-r from-brand-500 to-accent-500 p-5 text-left text-white"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <PlusCircle className="w-5 h-5" />
                      <span className="font-semibold">Create Course</span>
                    </div>
                    <p className="text-sm text-white/80">
                      Add a new course for the active semester with your department pre-filled.
                    </p>
                  </button>

                  <button
                    onClick={onOpenMyCourses}
                    className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-left text-white"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpen className="w-5 h-5 text-brand-300" />
                      <span className="font-semibold">My Courses</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Open course dashboards and jump into attendance scanning.
                    </p>
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-5">Active Semester Courses</h2>
                <div className="space-y-3">
                  {courses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                      No courses created for the active semester yet.
                    </div>
                  ) : (
                    courses.map((course) => (
                      <div
                        key={course.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-5"
                      >
                        <p className="text-sm font-mono text-brand-300 mb-1">{course.course_code}</p>
                        <h3 className="text-lg font-semibold text-white">{course.course_name}</h3>
                        <p className="text-sm text-slate-400 mt-2">
                          {course.department} • {course.enrolled_count} students
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;
