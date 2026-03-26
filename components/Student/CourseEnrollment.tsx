import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import SemesterCard from '../Shared/SemesterCard';
import { getCoursesBySemester, getDepartmentsForSemester } from '../../services/courseService';
import { dropCourse, enrollInCourse } from '../../services/enrollmentService';
import { getActiveSemester } from '../../services/semesterService';
import { refreshStudentProfile } from '../../services/studentService';
import type { Course } from '../../types/course';
import type { Semester } from '../../types/semester';
import type { StudentProfile } from '../../types/user';

interface CourseEnrollmentProps {
  student: StudentProfile;
  onStudentChange: (student: StudentProfile) => void;
  onBack: () => void;
}

const CourseEnrollment: React.FC<CourseEnrollmentProps> = ({
  student,
  onStudentChange,
  onBack,
}) => {
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState(student.department);
  const [loading, setLoading] = useState(true);
  const [actionCourseId, setActionCourseId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      setLoading(true);
      setError('');

      try {
        const semester = await getActiveSemester();

        if (!mounted) {
          return;
        }

        setActiveSemester(semester);

        if (!semester) {
          setCourses([]);
          setDepartments([]);
          return;
        }

        const [semesterCourses, semesterDepartments] = await Promise.all([
          getCoursesBySemester(semester.id),
          getDepartmentsForSemester(semester.id),
        ]);

        if (!mounted) {
          return;
        }

        setCourses(semesterCourses);
        setDepartments(semesterDepartments);
        if (semesterDepartments.includes(student.department)) {
          setSelectedDepartment(student.department);
        } else if (semesterDepartments.length > 0) {
          setSelectedDepartment(semesterDepartments[0]);
        }
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError.message || 'Unable to load semester courses.');
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
  }, [student.department]);

  const currentEnrollments = useMemo(
    () =>
      student.current_enrollments.filter((enrollment) =>
        activeSemester ? enrollment.semesterId === activeSemester.id : true
      ),
    [activeSemester, student.current_enrollments]
  );

  const enrolledCourseIds = useMemo(
    () => new Set(currentEnrollments.map((enrollment) => enrollment.courseId)),
    [currentEnrollments]
  );

  const filteredCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          course.department.toLowerCase() === selectedDepartment.toLowerCase()
      ),
    [courses, selectedDepartment]
  );

  const enrolledCourses = useMemo(
    () => courses.filter((course) => enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds]
  );

  const availableCourses = filteredCourses.filter((course) => !enrolledCourseIds.has(course.id));

  const handleEnroll = async (course: Course) => {
    if (!activeSemester) {
      return;
    }

    setActionCourseId(course.id);
    setError('');

    try {
      await enrollInCourse(student, course, activeSemester);
      const updatedStudent = await refreshStudentProfile(student.uid);
      onStudentChange(updatedStudent);
    } catch (actionError: any) {
      setError(actionError.message || 'Unable to enroll in this course.');
    } finally {
      setActionCourseId(null);
    }
  };

  const handleDrop = async (course: Course) => {
    if (!activeSemester) {
      return;
    }

    setActionCourseId(course.id);
    setError('');

    try {
      await dropCourse(student, course, activeSemester.id);
      const updatedStudent = await refreshStudentProfile(student.uid);
      onStudentChange(updatedStudent);
    } catch (actionError: any) {
      setError(actionError.message || 'Unable to drop this course.');
    } finally {
      setActionCourseId(null);
    }
  };

  const renderCourseCard = (course: Course, enrolled: boolean) => (
    <motion.div
      key={course.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-mono text-brand-300 mb-1">{course.course_code}</p>
          <h3 className="text-lg font-semibold text-white">{course.course_name}</h3>
          <p className="text-sm text-slate-400 mt-1">
            {course.department}
            {course.lecturer_name ? ` • ${course.lecturer_name}` : ''}
          </p>
          <p className="text-xs text-slate-500 mt-2">{course.enrolled_count} enrolled</p>
        </div>
      </div>

      <button
        onClick={() => (enrolled ? handleDrop(course) : handleEnroll(course))}
        disabled={actionCourseId === course.id}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          enrolled
            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
        } disabled:opacity-60`}
      >
        {actionCourseId === course.id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : enrolled ? (
          <MinusCircle className="w-4 h-4" />
        ) : (
          <PlusCircle className="w-4 h-4" />
        )}
        {enrolled ? 'Drop' : 'Enroll'}
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <SemesterCard
              semester={activeSemester}
              title="Enrollment Window"
              subtitle="Enrollment stays open throughout the semester, so you can add or drop courses anytime."
            />

            <div className="glass-panel rounded-3xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Department Filter</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {departments.map((department) => (
                  <button
                    key={department}
                    onClick={() => setSelectedDepartment(department)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      selectedDepartment === department
                        ? 'bg-brand-500 text-white'
                        : 'bg-white/5 text-slate-300 border border-white/10'
                    }`}
                  >
                    {department}
                  </button>
                ))}
              </div>
              <select
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="glass-panel rounded-3xl p-8 flex items-center gap-3 text-slate-300">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading available courses...
              </div>
            ) : !activeSemester ? (
              <div className="glass-panel rounded-3xl p-8 text-slate-400">
                There is no active semester yet, so enrollment is currently unavailable.
              </div>
            ) : (
              <>
                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-1">Enrolled Courses</h2>
                  <p className="text-slate-400 text-sm mb-5">
                    These are your current courses for {activeSemester.semester_name}.
                  </p>

                  <div className="space-y-3">
                    {enrolledCourses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                        You have not enrolled in any courses this semester yet.
                      </div>
                    ) : (
                      enrolledCourses.map((course) => renderCourseCard(course, true))
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-1">Available Courses</h2>
                  <p className="text-slate-400 text-sm mb-5">
                    Showing all courses in {selectedDepartment}. Levels are intentionally not filtered.
                  </p>

                  <div className="space-y-3">
                    {availableCourses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                        No more courses are available in this department right now.
                      </div>
                    ) : (
                      availableCourses.map((course) => renderCourseCard(course, false))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseEnrollment;
