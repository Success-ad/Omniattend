import React, { useState } from 'react';
import { CalendarPlus, CheckCircle2, Loader2, StopCircle } from 'lucide-react';
import { archiveSemester, createSemesterWithAutoArchive } from '../../services/adminService';
import type { Semester } from '../../types/semester';

interface SemesterManagementProps {
  activeSemester: Semester | null;
  semesters: Semester[];
  onChanged: () => Promise<void>;
}

const SemesterManagement: React.FC<SemesterManagementProps> = ({
  activeSemester,
  semesters,
  onChanged,
}) => {
  const [semesterName, setSemesterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateSemester = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createSemesterWithAutoArchive({
        semester_name: semesterName,
        start_date: startDate,
        end_date: endDate,
      });
      setSemesterName('');
      setStartDate('');
      setEndDate('');
      await onChanged();
    } catch (createError: any) {
      setError(createError.message || 'Unable to create the semester.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSemester = async () => {
    if (!activeSemester) {
      return;
    }

    const confirmed = window.confirm(
      `End ${activeSemester.semester_name} and archive student attendance history?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await archiveSemester(activeSemester.id);
      await onChanged();
    } catch (archiveError: any) {
      setError(archiveError.message || 'Unable to archive this semester.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-5">
          <CalendarPlus className="w-5 h-5 text-brand-400" />
          <h2 className="text-xl font-bold text-white">Semester Management</h2>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleCreateSemester} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
              Semester Name
            </label>
            <input
              value={semesterName}
              onChange={(event) => setSemesterName(event.target.value)}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white"
              placeholder="Semester 2025/26.1"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-white font-medium disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
              Create Semester
            </button>

            <button
              type="button"
              disabled={!activeSemester || loading}
              onClick={handleEndSemester}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-300 font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              End Active Semester
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel rounded-3xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Semester Timeline</h2>
        </div>

        <div className="space-y-3">
          {semesters.map((semester) => (
            <div
              key={semester.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-white">{semester.semester_name}</p>
                <p className="text-sm text-slate-400">
                  {semester.start_date} to {semester.end_date}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
                  semester.is_active
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {semester.is_active ? 'Active' : semester.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SemesterManagement;
