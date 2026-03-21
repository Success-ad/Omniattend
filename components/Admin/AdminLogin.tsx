import React, { useState } from 'react';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../../services/adminService';
import type { AdminProfile } from '../../types/user';

interface AdminLoginProps {
  onBack: () => void;
  onLogin: (admin: AdminProfile) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onBack, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const admin = await loginAdmin(email, password);
      onLogin(admin);
    } catch (loginError: any) {
      setError(loginError.message || 'Unable to sign in as admin.');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-slate-400">
            Sign in with an admin account created in Firebase Authentication and Firestore.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white outline-none focus:border-brand-500"
              placeholder="admin@school.edu"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 py-3.5 text-white outline-none focus:border-brand-500"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-4 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Signing In...' : 'Open Admin Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
