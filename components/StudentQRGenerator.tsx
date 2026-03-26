import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, User, QrCode as QrCodeIcon } from 'lucide-react';
import type { Course } from '../types/course';
import type { StudentProfile } from '../types/user';

interface StudentQRGeneratorProps {
  onBack: () => void;
  student: StudentProfile;
  course: Course;
}

interface StudentQRPayload {
  // Semester-aware payload so scanner logs can be archived by course and semester later.
  studentId: string;
  studentUid: string;
  studentName?: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterId: string;
  timestamp: number;
  nonce: string;
}

const generateNonce = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const StudentQRGenerator: React.FC<StudentQRGeneratorProps> = ({
  onBack,
  student,
  course,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [nonce, setNonce] = useState('');
  const [lastGenerated, setLastGenerated] = useState<number>(Date.now());

  const generateQR = useCallback(async () => {
    const nextNonce = generateNonce();
    const payload: StudentQRPayload = {
      studentId: student.matricNumber.toUpperCase(),
      studentUid: student.uid,
      studentName: student.fullName,
      courseId: course.id,
      courseCode: course.course_code,
      courseName: course.course_name,
      semesterId: course.semester_id,
      timestamp: Date.now(),
      nonce: nextNonce,
    };

    const qrValue = await QRCode.toDataURL(JSON.stringify(payload), {
      width: 420,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    });

    setQrDataUrl(qrValue);
    setNonce(nextNonce);
    setLastGenerated(Date.now());
  }, [course, student]);

  useEffect(() => {
    generateQR();
    const interval = setInterval(generateQR, 60000);
    return () => clearInterval(interval);
  }, [generateQR]);

  return (
    <div className="min-h-[100dvh] bg-dark-bg p-6 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10" />
      <div className="w-full max-w-md relative z-10">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="glass-panel rounded-[2.5rem] p-2 border border-white/10 shadow-2xl shadow-black/40">
          <div className="bg-white rounded-[2rem] p-6 text-slate-900">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Attendance QR
                </p>
                <h1 className="text-2xl font-bold">{course.course_code}</h1>
                <p className="text-sm text-slate-500">{course.course_name}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                <QrCodeIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Student
                  </p>
                  <p className="font-semibold">{student.fullName}</p>
                  <p className="text-sm text-slate-500 font-mono">{student.matricNumber}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-900 p-4 mb-6">
              {qrDataUrl ? (
                <motion.img
                  key={nonce}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={qrDataUrl}
                  alt="Attendance QR"
                  className="w-full h-full object-contain rounded-2xl bg-white"
                />
              ) : null}
            </div>

            <button
              onClick={generateQR}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 font-medium text-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh QR
            </button>

            <div className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
              Last generated {new Date(lastGenerated).toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
            Auto-refreshes every 60 seconds for secure attendance scanning
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudentQRGenerator;
