import React from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Semester } from '../../types/semester';

interface SemesterCardProps {
  semester: Semester | null;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SemesterCard: React.FC<SemesterCardProps> = ({
  semester,
  title = 'Current Semester',
  subtitle,
  actionLabel,
  onAction,
}) => {
  if (!semester) {
    return (
      <div className="glass-panel rounded-3xl p-6 border border-white/10">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-3">{title}</p>
        <h3 className="text-2xl font-bold text-white mb-2">No Active Semester</h3>
        <p className="text-slate-400 text-sm">
          An admin needs to create a semester before courses and enrollments can start.
        </p>
      </div>
    );
  }

  const statusLabel = semester.is_active ? 'Active' : semester.status;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-3xl p-6 border border-white/10 overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2">{title}</p>
            <h3 className="text-2xl font-bold text-white">{semester.semester_name}</h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
          <CalendarDays className="w-4 h-4 text-brand-400" />
          <span>
            {semester.start_date} to {semester.end_date}
          </span>
        </div>

        {subtitle ? <p className="text-sm text-slate-400 mb-5">{subtitle}</p> : null}

        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-colors"
          >
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
};

export default SemesterCard;
