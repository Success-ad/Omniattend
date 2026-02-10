import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Lock, BookOpen, Phone, Calendar, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

// Firebase imports (you'll need to install these)
import { auth, db } from '../services/firebaseClient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface StudentRegistrationProps {
  onBack: () => void;
  onRegistrationSuccess: () => void;
}

const AVAILABLE_COURSES = [
  { id: 'CS-404', name: 'Network Security', desc: 'Protocol Analysis' },
  { id: 'CS-302', name: 'Algorithms II', desc: 'Data Structures' },
  { id: 'ETH-101', name: 'Cyber Ethics', desc: 'Legal Frameworks' },
  { id: 'SYS-500', name: 'Kernel Arch', desc: 'System Design' },
];

const StudentRegistration: React.FC<StudentRegistrationProps> = ({ onBack, onRegistrationSuccess }) => {
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    matricNumber: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    department: '',
    level: '100',
    selectedCourses: [] as string[]
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'info' | 'courses'>('info');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  // Toggle course selection
  const toggleCourse = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.firstName.trim()) return "First name is required";
    if (!formData.lastName.trim()) return "Last name is required";
    if (!formData.matricNumber.trim()) return "Matric number is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    if (!formData.department.trim()) return "Department is required";
    return null;
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (formData.selectedCourses.length === 0) {
      setError("Please select at least one course");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ====== FIREBASE REGISTRATION ======
      // Uncomment when Firebase is configured

      // 1. Check if matric number already exists
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('matricNumber', '==', formData.matricNumber.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('Matric number already registered');
      }

      // 2. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // 3. Store student data in Firestore
      await setDoc(doc(db, 'students', user.uid), {
        uid: user.uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        matricNumber: formData.matricNumber.toUpperCase(),
        email: formData.email.toLowerCase(),
        phoneNumber: formData.phoneNumber,
        department: formData.department,
        level: formData.level,
        enrolledCourses: formData.selectedCourses,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });

      // 4. Create course enrollments
      for (const courseId of formData.selectedCourses) {
        await setDoc(doc(db, 'enrollments', `${user.uid}_${courseId}`), {
          studentId: user.uid,
          matricNumber: formData.matricNumber.toUpperCase(),
          courseId: courseId,
          enrolledAt: new Date().toISOString(),
          status: 'active'
        });
      }
      

      // Success!
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        onRegistrationSuccess();
      }, 2000);

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-slate-400 mb-1">Welcome, {formData.firstName}!</p>
          <p className="text-slate-500 text-sm">Matric Number: {formData.matricNumber.toUpperCase()}</p>
          <p className="text-slate-500 text-sm mt-4">Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  // Course Selection Step
  if (step === 'courses') {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={() => setStep('info')} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Select Courses</h2>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10 pb-10">
          <p className="text-slate-400 text-sm mb-2">
            Selected: {formData.selectedCourses.length} course(s)
          </p>

          {AVAILABLE_COURSES.map((course, idx) => (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={course.id}
              onClick={() => toggleCourse(course.id)}
              className={`glass-panel p-5 rounded-2xl text-left transition-all ${
                formData.selectedCourses.includes(course.id)
                  ? 'bg-brand-500/10 border-brand-500/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    formData.selectedCourses.includes(course.id)
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1">{course.name}</h3>
                    <p className="text-sm text-slate-400 font-mono">{course.id} • {course.desc}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.selectedCourses.includes(course.id)
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-slate-600'
                }`}>
                  {formData.selectedCourses.includes(course.id) && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            </motion.button>
          ))}

          <button
            onClick={handleRegister}
            disabled={loading || formData.selectedCourses.length === 0}
            className="w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/30 transition-all hover:scale-[1.02] mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </div>
      </div>
    );
  }

  // Personal Information Step
  return (
    <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
      <button onClick={onBack} className="absolute top-6 left-6 p-3 rounded-full glass-button text-slate-300 z-20">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/30">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Student Registration</h2>
            <p className="text-slate-400 font-medium">Create your account</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setStep('courses'); }} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                  placeholder=""
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                  placeholder=""
                  required
                />
              </div>
            </div>

            {/* Matric Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Matric Number
              </label>
              <input
                type="text"
                name="matricNumber"
                value={formData.matricNumber}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-mono text-sm"
                placeholder=""
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                placeholder=""
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                placeholder=""
              />
            </div>

            {/* Department & Level */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                  placeholder=""
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                >
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                  <option value="500">500</option>
                  <option value="600">600</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/30 transition-all hover:scale-[1.02] mt-6"
            >
              Next: Select Courses
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Already have an account?{' '}
              <button onClick={onBack} className="text-brand-400 hover:text-brand-300 font-semibold">
                Sign In
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;
