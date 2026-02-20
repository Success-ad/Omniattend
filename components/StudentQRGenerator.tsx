import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { ArrowLeft, User, BookOpen, ChevronRight, Calendar, LogOut, QrCode as QrCodeIcon, RefreshCw } from 'lucide-react';
import { auth, db } from '../services/firebaseClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const AVAILABLE_COURSES = [
  { id: 'CS-404', name: 'Network Security', desc: 'Protocol Analysis' },
  { id: 'CS-302', name: 'Algorithms II', desc: 'Data Structures' },
  { id: 'ETH-101', name: 'Cyber Ethics', desc: 'Legal Frameworks' },
  { id: 'SYS-500', name: 'Kernel Arch', desc: 'System Design' },
];

interface StudentQRPayload {
  studentId: string;
  studentName?: string;
  courseId: string;
  courseName: string;
  timestamp: number;
  nonce: string;
}

enum StudentStep {
  LOGIN = 'LOGIN',
  SELECT_COURSE = 'SELECT_COURSE',
  QR_DISPLAY = 'QR_DISPLAY'
}

interface StudentQRGeneratorProps {
  onBack: () => void;
}

const StudentQRGenerator: React.FC<StudentQRGeneratorProps> = ({ onBack }) => {
  const [step, setStep] = useState<StudentStep>(StudentStep.LOGIN);
  
  // Auth State
  const [matricNumber, setMatricNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [password, setPassword] = useState('');
  
  // Selection State
  const [selectedCourse, setSelectedCourse] = useState<typeof AVAILABLE_COURSES[0] | null>(null);
  
  // QR State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [currentNonce, setCurrentNonce] = useState<string>('');
  const [lastGenerated, setLastGenerated] = useState<number>(0);
  
  // Generate a random nonce
  const generateNonce = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Generate QR Code with student details
  const generateQR = useCallback(async () => {
    if (!selectedCourse || !matricNumber) return;

    const nonce = generateNonce();
    const payload: StudentQRPayload = {
      studentId: matricNumber.toUpperCase(),
      studentName: studentName || undefined,
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      timestamp: Date.now(),
      nonce: nonce
    };

    try {
      const qrData = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      setQrDataUrl(qrData);
      setCurrentNonce(nonce);
      setLastGenerated(Date.now());
    } catch (err) {
      console.error('QR Generation Error:', err);
    }
  }, [selectedCourse, matricNumber, studentName]);

  // Auto-refresh QR code every 60 seconds
  useEffect(() => {
    if (step !== StudentStep.QR_DISPLAY) return;

    generateQR(); // Generate immediately
    const interval = setInterval(generateQR, 60000); // Refresh every 60s

    return () => clearInterval(interval);
  }, [step, generateQR]);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    // 1. Find student by matric number
    const q = query(collection(db, 'students'), where('matricNumber', '==', matricNumber.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert('Matric number not found');
      return;
    }

    const studentData = snapshot.docs[0].data();

    // 2. Sign in with their email + password
    await signInWithEmailAndPassword(auth, studentData.email, password);

    // 3. Set student name from Firestore
    setStudentName(studentData.fullName);
    setStep(StudentStep.SELECT_COURSE);
  } catch (err) {
    alert('Invalid credentials');
  }
};

  const handleCourseSelect = (course: typeof AVAILABLE_COURSES[0]) => {
    setSelectedCourse(course);
    setStep(StudentStep.QR_DISPLAY);
  };

  const handleInternalBack = () => {
    switch (step) {
      case StudentStep.QR_DISPLAY:
        setStep(StudentStep.SELECT_COURSE);
        break;
      case StudentStep.SELECT_COURSE:
        setStep(StudentStep.LOGIN);
        break;
      default:
        onBack();
    }
  };

  const handleLogout = () => {
    setMatricNumber('');
    setStudentName('');
    setPassword('');
    setSelectedCourse(null);
    setStep(StudentStep.LOGIN);
  };

  // --- RENDER: LOGIN ---
  if (step === StudentStep.LOGIN) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <button onClick={onBack} className="absolute top-6 left-6 p-3 rounded-full glass-button text-slate-300 z-20">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md z-10">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent-500/30">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Student Portal</h2>
              <p className="text-slate-400 font-medium">Generate your attendance QR</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Matric Number
                </label>
                <input
                  type="text"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-all font-mono"
                  placeholder="e.g 20/2726"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Full Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-all"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-accent-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-accent-500/30 transition-all hover:scale-[1.02] mt-8"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: SELECT COURSE ---
  if (step === StudentStep.SELECT_COURSE) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white leading-none">Select Course</h2>
            <span className="text-sm text-slate-400 font-mono">{matricNumber}</span>
          </div>
          <button onClick={handleLogout} className="p-3 rounded-full glass-button text-red-400 hover:text-red-300">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10">
          {AVAILABLE_COURSES.map((course, idx) => (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={course.id}
              onClick={() => handleCourseSelect(course)}
              className="glass-panel p-5 rounded-2xl text-left hover:bg-white/5 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500/20 to-purple-500/20 flex items-center justify-center text-accent-400 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">{course.name}</h3>
                  <p className="text-sm text-slate-400 font-mono">{course.id}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: QR DISPLAY ---
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-900/40 via-dark-bg to-dark-bg" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[100px] animate-pulse-soft" />

      <button 
        onClick={handleInternalBack}
        className="absolute top-6 left-6 p-3 rounded-full glass-button text-slate-300 z-20"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <button 
        onClick={handleLogout}
        className="absolute top-6 right-6 p-3 rounded-full glass-button text-red-400 hover:text-red-300 z-20"
      >
        <LogOut className="w-5 h-5" />
      </button>

      <div className="w-full max-w-sm relative z-10">
        <div className="glass-panel p-1.5 rounded-[2.5rem] shadow-2xl shadow-black/50 ring-1 ring-white/10">
          <div className="bg-white rounded-[2rem] p-6 pb-8 overflow-hidden relative">
            
            {/* Header */}
            <div className="mb-6 pb-6 border-b border-dashed border-slate-200 relative">
              <div className="absolute -bottom-[25px] -left-[30px] w-5 h-5 bg-dark-bg rounded-full" />
              <div className="absolute -bottom-[25px] -right-[30px] w-5 h-5 bg-dark-bg rounded-full" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-extrabold text-slate-900 leading-tight mb-1">Your QR Code</h2>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-accent-600 font-bold text-sm">{selectedCourse?.id} - {selectedCourse?.name}</span>
                    <span className="text-slate-400 text-xs font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center text-accent-600">
                  <QrCodeIcon className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Student Info */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Student ID</p>
                  <p className="text-slate-900 font-bold text-lg leading-none font-mono">{matricNumber}</p>
                </div>
              </div>
              {studentName && (
                <p className="text-slate-600 text-sm font-medium pl-13">{studentName}</p>
              )}
            </div>

            {/* QR Section */}
            <div className="aspect-square w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden mb-6 relative border border-slate-800 shadow-inner">
              {qrDataUrl && (
                <motion.img 
                  key={currentNonce}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={qrDataUrl} 
                  alt="Student QR Code" 
                  className="w-full h-full object-contain p-4"
                />
              )}
              
              {/* Scan indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-accent-500/20 backdrop-blur-sm rounded-full border border-accent-500/30">
                <span className="text-accent-300 text-xs font-bold">Ready to Scan</span>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={generateQR}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh QR Code
            </button>
            
            <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest mt-4 font-semibold">
              Show this to your lecturer's scanner
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 font-medium backdrop-blur-sm">
            Auto-refreshes every 60 seconds
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQRGenerator;
