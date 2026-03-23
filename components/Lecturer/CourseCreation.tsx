import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createCourse } from '../../services/courseService';
import { getLecturerProfile } from '../../services/lecturerService';
import { getActiveSemester } from '../../services/semesterService';
import type { Course } from '../../types/course';
import type { Semester } from '../../types/semester';
import type { LecturerProfile } from '../../types/user';

interface CourseCreationProps {
  lecturer: LecturerProfile;
  onLecturerChange: (lecturer: LecturerProfile) => void;
  onBack: () => void;
  onCreated: (course: Course) => void;
}

const CourseCreation: React.FC<CourseCreationProps> = ({
  lecturer,
  onLecturerChange,
  onBack,
  onCreated,
}) => {
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [loadingSemester, setLoadingSemester] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    department: lecturer.department,
  });

  useEffect(() => {
    let mounted = true;

    const loadSemester = async () => {
      setLoadingSemester(true);
      try {
        const semester = await getActiveSemester();
        if (mounted) {
          setActiveSemester(semester);
        }
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError.message || 'Unable to load the active semester.');
        }
      } finally {
        if (mounted) {
          setLoadingSemester(false);
        }
      }
    };

    loadSemester();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeSemester) {
      setError('There is no active semester to attach this course to.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const course = await createCourse({
        course_code: form.courseCode,
        course_name: form.courseName,
        description: form.description,
        department: form.department,
        semester_id: activeSemester.id,
        semester_name: activeSemester.semester_name,
        lecturer_id: lecturer.uid,
        lecturer_name: lecturer.fullName,
      });
      const refreshedLecturer = await getLecturerProfile(lecturer.uid);
      onLecturerChange(refreshedLecturer);
      onCreated(course);
    } catch (createError: any) {
      setError(createError.message || 'Unable to create the course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl glass-panel rounded-[2rem] p-8 border border-white/10">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Course</h1>
          <p className="text-slate-400">
            Courses are always created inside the active semester.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {loadingSemester ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading active semester...
          </div>
        ) : !activeSemester ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-slate-400">
            No active semester is available yet. Ask an admin to create one first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Active semester: <span className="text-white font-semibold">{activeSemester.semester_name}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="courseCode"
                value={form.courseCode}
                onChange={handleChange}
                className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
                placeholder="Course code"
                required
              />
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
                placeholder="Department"
                required
              />
            </div>

            <input
              name="courseName"
              value={form.courseName}
              onChange={handleChange}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Course name"
              required
            />

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white resize-none"
              placeholder="Course description"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-4 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Creating Course...' : 'Create Course'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CourseCreation;
