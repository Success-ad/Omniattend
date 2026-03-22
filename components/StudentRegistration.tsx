import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react';
import { registerStudent } from '../services/studentService';

interface StudentRegistrationProps {
  onBack: () => void;
  onRegistrationSuccess: () => void;
}

const StudentRegistration: React.FC<StudentRegistrationProps> = ({
  onBack,
  onRegistrationSuccess,
}) => {
  // Semester-aware update: registration now creates the account first, then enrollment happens inside the dashboard.
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    matricNumber: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    department: '',
    level: '100',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
    setError('');
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await registerStudent({
        firstName: form.firstName,
        lastName: form.lastName,
        matricNumber: form.matricNumber,
        email: form.email,
        phoneNumber: form.phoneNumber,
        password: form.password,
        department: form.department,
        level: form.level,
      });
      setSuccess(true);
      setTimeout(onRegistrationSuccess, 2500);
    } catch (registrationError: any) {
      setError(registrationError.message || 'Unable to create your student account.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-dark-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Registration Successful</h2>
          <p className="text-slate-400">
            Your student account has been created. You can now sign in and enroll in semester courses.
          </p>
        </motion.div>
      </div>
    );
  }

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

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Registration</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="First name"
              required
            />
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Last name"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="matricNumber"
              value={form.matricNumber}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Matric number"
              required
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Email address"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Department"
              required
            />
            <select
              name="level"
              value={form.level}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
            >
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
              <option value="500">500</option>
            </select>
          </div>

          <input
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
            placeholder="Phone number (optional)"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Password"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Confirm password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-4 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Creating Account...' : 'Create Student Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration;
