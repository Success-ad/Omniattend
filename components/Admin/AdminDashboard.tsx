import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, GraduationCap, Loader2, LogOut, School, Users } from 'lucide-react';
import SemesterCard from '../Shared/SemesterCard';
import SemesterManagement from './SemesterManagement';
import { getAdminDashboardData, logoutAdmin } from '../../services/adminService';
import type { Semester } from '../../types/semester';
import type { AdminProfile, LecturerProfile, StudentProfile } from '../../types/user';
import type { Course } from '../../types/course';

interface AdminDashboardProps {
  admin: AdminProfile;
  onLogout: () => void;
  onBack: () => void;
}

interface DashboardData {
  stats: {
    studentCount: number;
    lecturerCount: number;
    courseCount: number;
    semesterCount: number;
  };
  students: StudentProfile[];
  lecturers: LecturerProfile[];
  courses: Course[];
  semesters: Semester[];
  activeSemester: Semester | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onLogout, onBack }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getAdminDashboardData();
      setDashboardData(data as DashboardData);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load the admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    onLogout();
  };

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">{admin.fullName || admin.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {loading ? (
          <div className="glass-panel rounded-3xl p-8 flex items-center gap-3 text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading admin dashboard...
          </div>
        ) : error || !dashboardData ? (
          <div className="glass-panel rounded-3xl p-8 text-red-300 border border-red-500/20 bg-red-500/10">
            {error || 'Unable to load admin dashboard.'}
          </div>
        ) : (
          <div className="space-y-6">
            <SemesterCard
              semester={dashboardData.activeSemester}
              subtitle="Creating a new semester automatically archives the current one so historical attendance remains preserved."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <Users className="w-5 h-5 text-brand-400 mb-3" />
                <p className="text-slate-400 text-sm mb-2">Students</p>
                <p className="text-3xl font-bold text-white">{dashboardData.stats.studentCount}</p>
              </div>
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <GraduationCap className="w-5 h-5 text-accent-400 mb-3" />
                <p className="text-slate-400 text-sm mb-2">Lecturers</p>
                <p className="text-3xl font-bold text-white">{dashboardData.stats.lecturerCount}</p>
              </div>
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <BookOpen className="w-5 h-5 text-emerald-400 mb-3" />
                <p className="text-slate-400 text-sm mb-2">Courses</p>
                <p className="text-3xl font-bold text-white">{dashboardData.stats.courseCount}</p>
              </div>
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <School className="w-5 h-5 text-amber-400 mb-3" />
                <p className="text-slate-400 text-sm mb-2">Semesters</p>
                <p className="text-3xl font-bold text-white">{dashboardData.stats.semesterCount}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SemesterManagement
                activeSemester={dashboardData.activeSemester}
                semesters={dashboardData.semesters}
                onChanged={loadDashboard}
              />

              <div className="space-y-6">
                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-4">Students</h2>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {dashboardData.students.map((student) => (
                      <div
                        key={student.uid}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="font-semibold text-white">{student.fullName}</p>
                        <p className="text-sm text-slate-400">
                          {student.matricNumber} • {student.department} • Level {student.level}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-4">Lecturers</h2>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {dashboardData.lecturers.map((lecturer) => (
                      <div
                        key={lecturer.uid}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="font-semibold text-white">{lecturer.fullName}</p>
                        <p className="text-sm text-slate-400">
                          {lecturer.department} • {lecturer.email}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-4">Courses</h2>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {dashboardData.courses.map((course) => (
                      <div
                        key={course.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="font-semibold text-white">
                          {course.course_code} • {course.course_name}
                        </p>
                        <p className="text-sm text-slate-400">
                          {course.department}
                          {course.lecturer_name ? ` • ${course.lecturer_name}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
