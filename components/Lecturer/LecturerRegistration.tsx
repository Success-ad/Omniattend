import React, { useState } from 'react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { registerLecturer } from '../../services/lecturerService';
import type { LecturerProfile } from '../../types/user';

interface LecturerRegistrationProps {
  onBack: () => void;
  onRegistrationSuccess: (lecturer: LecturerProfile) => void;
}

const LecturerRegistration: React.FC<LecturerRegistrationProps> = ({
  onBack,
  onRegistrationSuccess,
}) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
      const lecturer = await registerLecturer({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        department: form.department,
        phoneNumber: form.phoneNumber,
      });
      onRegistrationSuccess(lecturer);
    } catch (registrationError: any) {
      setError(registrationError.message || 'Unable to create the lecturer account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-xl glass-panel rounded-[2rem] p-8 border border-white/10">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Lecturer Registration</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
            placeholder="Email address"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Department"
              required
            />
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white"
              placeholder="Phone number (optional)"
            />
          </div>

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
            {loading ? 'Creating Account...' : 'Create Lecturer Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LecturerRegistration;
