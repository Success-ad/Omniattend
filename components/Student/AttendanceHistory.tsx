import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, History } from 'lucide-react';
import type { StudentProfile } from '../../types/user';

interface AttendanceHistoryProps {
  student: StudentProfile;
  onBack: () => void;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ student, onBack }) => {
  const semesters = useMemo(() => {
    const entries = new Map<string, string>();

    student.attendance_history.forEach((history) => {
      entries.set(history.semesterId, history.semesterName);
    });

    return Array.from(entries.entries()).map(([id, name]) => ({ id, name }));
  }, [student.attendance_history]);

  const [selectedSemesterId, setSelectedSemesterId] = useState(semesters[0]?.id ?? '');

  const semesterHistory = student.attendance_history.filter(
    (history) => history.semesterId === selectedSemesterId
  );

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="glass-panel rounded-3xl p-6 border border-white/10 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Attendance History</h1>
              <p className="text-slate-400">
                Review simple attendance summaries in the format attended X/Y classes.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                Semester
              </label>
              <select
                value={selectedSemesterId}
                onChange={(event) => setSelectedSemesterId(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white"
              >
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {student.attendance_history.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center border border-white/10">
            <History className="w-10 h-10 mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-semibold text-white mb-2">No Archived History Yet</h2>
            <p className="text-slate-400">
              Attendance summaries will appear here after an admin ends a semester.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {semesterHistory.map((history) => (
              <div
                key={`${history.semesterId}-${history.courseId}`}
                className="glass-panel rounded-3xl p-6 border border-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-mono text-brand-300 mb-1">{history.courseCode}</p>
                    <h2 className="text-2xl font-bold text-white">{history.courseName}</h2>
                    <p className="text-slate-400 mt-2">
                      {history.department}
                      {history.lecturerName ? ` • ${history.lecturerName}` : ''}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-brand-500/10 border border-brand-500/20 px-4 py-3 text-right">
                    <p className="text-sm text-brand-100">Attendance</p>
                    <p className="text-2xl font-bold text-white">
                      {history.attendedClasses}/{history.totalClasses}
                    </p>
                    <p className="text-brand-200 text-sm">{history.percentage}%</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm text-slate-400">
                  <CalendarDays className="w-4 h-4 text-brand-400" />
                  Archived on {new Date(history.archivedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
