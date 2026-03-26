import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Loader2, ScanLine } from 'lucide-react';
import { getCoursesForLecturer } from '../../services/courseService';
import { getActiveSemester } from '../../services/semesterService';
import type { Course } from '../../types/course';
import type { Semester } from '../../types/semester';
import type { LecturerProfile } from '../../types/user';

interface MyCoursesProps {
  lecturer: LecturerProfile;
  onBack: () => void;
  onOpenScanner: (course: Course) => void;
  onOpenCreateCourse: () => void;
}

const MyCourses: React.FC<MyCoursesProps> = ({
  lecturer,
  onBack,
  onOpenScanner,
  onOpenCreateCourse,
}) => {
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      setLoading(true);
      setError('');

      try {
        const semester = await getActiveSemester();
        const lecturerCourses = await getCoursesForLecturer(lecturer.uid);

        if (!mounted) {
          return;
        }

        setActiveSemester(semester);
        setCourses(lecturerCourses);
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError.message || 'Unable to load lecturer courses.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      mounted = false;
    };
  }, [lecturer.uid]);

  const activeCourses = useMemo(
    () =>
      activeSemester
        ? courses.filter((course) => course.semester_id === activeSemester.id)
        : [],
    [activeSemester, courses]
  );

  const archivedCourses = useMemo(
    () =>
      activeSemester
        ? courses.filter((course) => course.semester_id !== activeSemester.id)
        : courses,
    [activeSemester, courses]
  );

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">My Courses</h1>
            <p className="text-slate-400 mt-2">
              Open a course to create sessions and launch QR or biometric attendance scanning.
            </p>
          </div>

          <button
            onClick={onOpenCreateCourse}
            className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-white font-medium"
          >
            Create Course
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-panel rounded-3xl p-8 text-slate-300 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading lecturer courses...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Active Semester</h2>
              <div className="space-y-3">
                {activeCourses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                    No courses are attached to the active semester yet.
                  </div>
                ) : (
                  activeCourses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-mono text-brand-300 mb-1">{course.course_code}</p>
                          <h3 className="text-lg font-semibold text-white">{course.course_name}</h3>
                          <p className="text-sm text-slate-400 mt-2">
                            {course.department} • {course.enrolled_count} students
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenScanner(course)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-white"
                      >
                        <ScanLine className="w-4 h-4" />
                        Open Scanner
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Past Semester Courses</h2>
              <div className="space-y-3">
                {archivedCourses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                    Archived courses will appear here after semesters are completed.
                  </div>
                ) : (
                  archivedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="font-semibold text-white">
                        {course.course_code} • {course.course_name}
                      </p>
                      <p className="text-sm text-slate-400">
                        {course.semester_name || 'Completed semester'} • {course.department}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
