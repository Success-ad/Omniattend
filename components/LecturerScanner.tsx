import React, { useEffect, useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { saveAttendance, createSession, getSessionHistory, getAttendanceForSession, loginLecturer, logoutLecturer } from '../services/attendanceService';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, GraduationCap, BookOpen, ShieldCheck, Users, Calendar, FileText, Type, LogOut, Check, X, Camera, History, UserCheck, Fingerprint, QrCode as QrCodeIcon } from 'lucide-react';

const AVAILABLE_COURSES = [
  { id: 'CS-404', name: 'Network Security', desc: 'Protocol Analysis', totalStudents: 42 },
  { id: 'CS-302', name: 'Algorithms II', desc: 'Data Structures', totalStudents: 82 },
  { id: 'ETH-101', name: 'Cyber Ethics', desc: 'Legal Frameworks', totalStudents: 35 },
  { id: 'CS-402', name: 'Kernel Arch', desc: 'System Design', totalStudents: 18 },
  { id: 'CS-309', name: 'Intro to AI', desc: 'Machine Learning Basics', totalStudents: 25 },
  { id: 'CS-410', name: 'Cloud Security', desc: 'Securing Cloud Infrastructures', totalStudents: 30 },
  { id: 'CS-305', name: 'Database Systems', desc: 'SQL & NoSQL Databases', totalStudents: 40 },
  { id: 'CS-315', name: 'Web Dev', desc: 'Full Stack Development', totalStudents: 38 }
];

enum LecturerStep {
  AUTH = 'AUTH',
  SELECT = 'SELECT',
  COURSE_DASHBOARD = 'COURSE_DASHBOARD',
  HISTORY = 'HISTORY',
  CREATE_SESSION = 'CREATE_SESSION',
  MODE_SELECT = 'MODE_SELECT',
  SCANNER = 'SCANNER',
  BIO_SCANNER = 'BIO_SCANNER'
}

interface StudentQRPayload {
  studentId: string;
  studentName?: string;
  courseId: string;
  courseName: string;
  timestamp: number;
  nonce: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName?: string;
  timestamp: string;
}

interface LecturerScannerProps {
  onBack: () => void;
}

const LecturerScanner: React.FC<LecturerScannerProps> = ({ onBack }) => {
  const [step, setStep] = useState<LecturerStep>(LecturerStep.AUTH);
  const [lecturerId, setLecturerId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<typeof AVAILABLE_COURSES[0] | null>(null);

  // Session State
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [selectedHistorySessionDetails, setSelectedHistorySessionDetails] = useState<any | null>(null);
  const [historyAttendanceRecords, setHistoryAttendanceRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scanner State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef<boolean>(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const attendanceRecordsRef = useRef<AttendanceRecord[]>([]);
  const [lastScannedStudent, setLastScannedStudent] = useState<{ id: string, name?: string, success: boolean } | null>(null);
  const [scanMessage, setScanMessage] = useState<string>('Position QR code in frame');

  // Biometric Scanner State
  const [scannerInput, setScannerInput] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [lastBioScannedStudent, setLastBioScannedStudent] = useState<string | null>(null);

  // Scanning cooldown to prevent duplicate scans
  const lastScanTimeRef = useRef<number>(0);
  const scannedNoncesRef = useRef<Set<string>>(new Set());
  const selectedCourseRef = useRef<typeof AVAILABLE_COURSES[0] | null>(null);
  const activeSessionIdRef = useRef<string>('');

  useEffect(() => {
    attendanceRecordsRef.current = attendanceRecords;
  }, [attendanceRecords]);

  useEffect(() => {
    selectedCourseRef.current = selectedCourse;
  }, [selectedCourse]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const handleInternalBack = () => {
    switch (step) {
      case LecturerStep.SCANNER:
      case LecturerStep.BIO_SCANNER:
        stopStream();
        setStep(LecturerStep.MODE_SELECT);
        setAttendanceRecords([]);
        break;
      case LecturerStep.MODE_SELECT:
        setStep(LecturerStep.COURSE_DASHBOARD);
        break;
      case LecturerStep.CREATE_SESSION:
        setStep(LecturerStep.COURSE_DASHBOARD);
        break;
      case LecturerStep.HISTORY:
        setStep(LecturerStep.COURSE_DASHBOARD);
        break;
      case LecturerStep.COURSE_DASHBOARD:
        setStep(LecturerStep.SELECT);
        break;
      case LecturerStep.SELECT:
        setStep(LecturerStep.AUTH);
        break;
      default:
        onBack();
    }
  };

  const handleLogout = async () => {
  await logoutLecturer();
  // rest of your existing logout logic...
  setLecturerId('');
  setPassword('');
  setSelectedCourse(null);
  setStep(LecturerStep.AUTH);
};

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    // lecturerId field becomes their email
    await loginLecturer(lecturerId, password);
    setStep(LecturerStep.SELECT);
  } catch (err) {
    alert("Invalid credentials");
  }
};

  const handleCourseSelect = (course: typeof AVAILABLE_COURSES[0]) => {
    setSelectedCourse(course);
    setStep(LecturerStep.COURSE_DASHBOARD);
  };

  const handleStartCreateSession = () => {
    if (!selectedCourse) return;
    setSessionName(`Lecture: ${selectedCourse.name}`);
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSessionDesc('');
    setStep(LecturerStep.CREATE_SESSION);
  };

  const handleViewHistory = async () => {
    if (!selectedCourse) return;
    setStep(LecturerStep.HISTORY);
    try {
      const data = await getSessionHistory(selectedCourse.id);
      setHistorySessions(data);
    } catch (err) {
      console.warn('Failed to load session history', err);
      setHistorySessions([]);
    }
  };

  const handleOpenSessionDetails = async (session: any) => {
    const sessionKey = session.session_id || session.id;
    if (!sessionKey) return;
    setHistoryLoading(true);
    try {
      const records = await getAttendanceForSession(session.session_id || session.session_id === 0 ? session.session_id : session.session_id || session.id);
      setHistoryAttendanceRecords(records);
      setSelectedHistorySessionDetails(session);
    } catch (err) {
      console.warn('Failed to load attendance records for session', err);
      setHistoryAttendanceRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseSessionDetails = () => {
    setSelectedHistorySessionDetails(null);
    setHistoryAttendanceRecords([]);
  };

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    const newSessionId = `${selectedCourse.id}-${Date.now().toString(36)}`;
    setActiveSessionId(newSessionId);

    // Persist session metadata
    try {
      await createSession({
        session_id: newSessionId,
        course_id: selectedCourse.id,
        name: sessionName,
        description: sessionDesc,
        date: sessionDate,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Backend session sync skipped - local mode active");
    }

    // Reset attendance records and scanner state
    setAttendanceRecords([]);
    scannedNoncesRef.current.clear();
    setStep(LecturerStep.MODE_SELECT);
  };

  const enterCameraMode = () => {
    setStep(LecturerStep.SCANNER);
  };

  const enterBiometricMode = () => {
    setLastBioScannedStudent(null);
    setStep(LecturerStep.BIO_SCANNER);
    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  const handleBiometricSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    const studentId = scannerInput.trim().toUpperCase();
    
    // Check if student already marked present
    const alreadyMarked = attendanceRecords.some(record => record.studentId === studentId);
    if (alreadyMarked) {
      setLastBioScannedStudent(null);
      setScannerInput('');
      // Brief visual feedback
      setTimeout(() => setLastBioScannedStudent(null), 100);
      return;
    }

    // Record Attendance
    const attendanceRecord: AttendanceRecord = {
      studentId: studentId,
      timestamp: new Date().toISOString()
    };
    try {
      await saveAttendance(activeSessionId, studentId, undefined, `BIO-${Date.now()}`);
      setAttendanceRecords(prev => [attendanceRecord, ...prev]);
      setLastBioScannedStudent(studentId);
      setScannerInput('');
    } catch (err) {
      alert("Error logging attendance or already scanned.");
    }
  };

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    isScanningRef.current = false;
    setIsScanning(false);
  }, []);

  // Start camera and scanning
  const startScanning = useCallback(async () => {
    if (isScanningRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          try {
            await playPromise;
          } catch (err) {
            console.error('Play error:', err);
            setScanMessage("Camera play failed, retrying...");
            stopStream();
            setTimeout(() => startScanning(), 500);
            return;
          }
        }
        
        isScanningRef.current = true;
        setIsScanning(true);
        setScanMessage("Position QR code in frame");
        requestAnimationFrame(tick);
      }
    } catch (err) {
      setScanMessage("Could not access camera");
      console.error('Camera access error:', err);
    }
  }, [stopStream]);

  // QR Scanner tick function
  const tick = () => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    
    // Safety check: if stream is lost, attempt recovery
    if (!video || !video.srcObject) {
      console.warn('Stream lost during scan, restarting...');
      isScanningRef.current = false;
      setIsScanning(false);
      setTimeout(() => startScanning(), 100);
      return;
    }

    // Only process if video has enough data (less strict than HAVE_ENOUGH_DATA)
    if (video.readyState < video.HAVE_CURRENT_DATA) {
      requestAnimationFrame(tick);
      return;
    }

    const canvas = canvasRef.current;

    // Only draw if canvas exists and video has valid dimensions
    if (canvas && video.videoHeight > 0 && video.videoWidth > 0) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          handleScanSuccess(code.data);
        }
      }
    }
    
    if (isScanningRef.current) requestAnimationFrame(tick);
  };

  // Handle successful QR scan
  const handleScanSuccess = async (data: string) => {
    // Cooldown check: prevent scanning same QR within 2 seconds
    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) {
      return;
    }

    try {
      const payload: StudentQRPayload = JSON.parse(data);

      // Validate payload structure
      if (!payload.studentId || !payload.courseId || !payload.nonce) {
        setScanMessage("Invalid QR code format");
        setLastScannedStudent({ id: 'Unknown', success: false });
        setTimeout(() => setLastScannedStudent(null), 2000);
        return;
      }

      // Check if nonce was already scanned (prevent duplicate scans)
      if (scannedNoncesRef.current.has(payload.nonce)) {
        setScanMessage("Already scanned!");
        setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false });
        setTimeout(() => setLastScannedStudent(null), 2000);
        return;
      }

      // Verify course match
      if (selectedCourseRef.current && payload.courseId !== selectedCourseRef.current.id) {
        setScanMessage("Wrong course QR code");
        setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false });
        setTimeout(() => setLastScannedStudent(null), 2000);
        return;
      }

      // Check if student already marked present in this session
      const alreadyMarked = attendanceRecordsRef.current.some(record => record.studentId === payload.studentId);
      if (alreadyMarked) {
        setScanMessage("Student already marked present");
        setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false });
        setTimeout(() => setLastScannedStudent(null), 2000);
        return;
      }

      // Record attendance
      const attendanceRecord: AttendanceRecord = {
        studentId: payload.studentId,
        studentName: payload.studentName,
        timestamp: new Date().toISOString()
      };

      // Save to database
      try {
        await saveAttendance(activeSessionIdRef.current, payload.studentId, payload.studentName, payload.nonce);
        // Success
        setAttendanceRecords(prev => [attendanceRecord, ...prev]);
        scannedNoncesRef.current.add(payload.nonce);
        lastScanTimeRef.current = now;
        setScanMessage(`✓ ${payload.studentName || payload.studentId} marked present`);
        setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: true });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setScanMessage("Position QR code in frame");
          setLastScannedStudent(null);
        }, 3000);
      } catch (err) {
        setScanMessage("Database error - try again");
        setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false });
        setTimeout(() => setLastScannedStudent(null), 2000);
      }

    } catch (err) {
      console.error('QR Parse Error:', err);
      setScanMessage("Invalid QR code");
      setLastScannedStudent({ id: 'Error', success: false });
      setTimeout(() => setLastScannedStudent(null), 2000);
    }
  };

  // Start scanning when entering scanner step
  useEffect(() => {
    if (step === LecturerStep.SCANNER) {
      startScanning();
    } else {
      stopStream();
    }

    return () => stopStream();
  }, [step, startScanning, stopStream]);

  // --- RENDER: LOGIN ---
  if (step === LecturerStep.AUTH) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <button onClick={onBack} className="absolute top-6 left-6 p-3 rounded-full glass-button text-slate-300 z-20">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md z-10">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/30">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Lecturer Login</h2>
              <p className="text-slate-400 font-medium">Scan student QR codes</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Lecturer ID (Email)
                </label>
                <input
                  type="text"
                  value={lecturerId}
                  onChange={(e) => setLecturerId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-mono"
                  placeholder="e.g, lecturer@babcock.com"
                  required
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/30 transition-all hover:scale-[1.02] mt-8"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Session Details Modal
  if (selectedHistorySessionDetails) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={handleCloseSessionDetails} />
        <div className="relative bg-dark-bg max-w-2xl w-full mx-4 rounded-2xl p-6 z-60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{selectedHistorySessionDetails.name}</h3>
              <p className="text-sm text-slate-400">{selectedHistorySessionDetails.date} • {selectedHistorySessionDetails.description || 'No description'}</p>
            </div>
            <button onClick={handleCloseSessionDetails} className="p-2 rounded-full glass-button text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <h4 className="text-sm text-slate-400 mb-2">Attendance ({historyAttendanceRecords.length})</h4>
            {historyLoading ? (
              <div className="text-slate-400">Loading...</div>
            ) : historyAttendanceRecords.length === 0 ? (
              <div className="glass-panel p-4 rounded-xl text-slate-400">No attendance records found.</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {historyAttendanceRecords.map((rec, idx) => (
                  <div key={`${rec.id}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{rec.student_name || rec.student_id}</p>
                      <p className="text-xs text-slate-400 font-mono">{rec.student_id}</p>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(typeof rec.timestamp === 'string' ? rec.timestamp : (rec.timestamp?.seconds ? rec.timestamp.seconds * 1000 : Date.now())).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: SELECT COURSE ---
  if (step === LecturerStep.SELECT) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white leading-none">Select Course</h2>
            <span className="text-sm text-slate-400 font-mono">{lecturerId}</span>
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">{course.name}</h3>
                  <p className="text-sm text-slate-400 font-mono">{course.id} • {course.totalStudents} students</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: COURSE DASHBOARD ---
  if (step === LecturerStep.COURSE_DASHBOARD) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white leading-none">{selectedCourse?.name}</h2>
            <span className="text-sm text-brand-400 font-medium">{selectedCourse?.id}</span>
          </div>
          <button onClick={handleLogout} className="p-3 rounded-full glass-button text-red-400 hover:text-red-300">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleStartCreateSession}
            className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white mb-1">Start Scanner</h3>
                  <p className="text-sm text-slate-400">Create new attendance session</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={handleViewHistory}
            className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <History className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white mb-1">Session History</h3>
                  <p className="text-sm text-slate-400">View past attendance records</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // --- RENDER: CREATE SESSION ---
  if (step === LecturerStep.CREATE_SESSION) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Create Session</h2>
        </div>

        <form onSubmit={handleCreateSessionSubmit} className="max-w-lg mx-auto w-full space-y-6 z-10">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Type className="w-4 h-4" /> Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Description <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={sessionDesc}
              onChange={(e) => setSessionDesc(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
              rows={3}
              placeholder="Add session details..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/30 transition-all hover:scale-[1.02] mt-8"
          >
            Start Scanning Session
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER: HISTORY ---
  if (step === LecturerStep.HISTORY) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Session History</h2>
        </div>

        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10 pb-10">
            {historySessions.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No session history found.</p>
            </div>
          ) : (
              historySessions.map((session, idx) => (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={session.id}
                  onClick={() => handleOpenSessionDetails(session)}
                  type="button"
                  className="glass-panel p-5 rounded-2xl text-left hover:bg-white/5 transition-all"
                >
                  <h3 className="font-bold text-white text-lg mb-2">{session.name}</h3>
                  <p className="text-slate-400 text-sm mb-3">{session.description || "No description"}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {session.date}</span>
                  </div>
                </motion.button>
              ))
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: MODE SELECT ---
  if (step === LecturerStep.MODE_SELECT) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white leading-none">Attendance Mode</h2>
            <span className="text-sm text-brand-400 font-medium">{sessionName}</span>
          </div>
          <button onClick={handleLogout} className="p-3 rounded-full glass-button text-red-400 hover:text-red-300">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10">
          <p className="text-slate-400 text-center mb-4">Choose how students will mark attendance</p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={enterCameraMode}
            className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                  <QrCodeIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white mb-1">QR Code Camera</h3>
                  <p className="text-sm text-slate-400">Scan student-generated QR codes</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={enterBiometricMode}
            className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-accent-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center text-accent-400 group-hover:scale-110 transition-transform">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white mb-1">Biometric System</h3>
                  <p className="text-sm text-slate-400">Attach hardware scanner</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // --- RENDER: BIOMETRIC SCANNER ---
  if (step === LecturerStep.BIO_SCANNER) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 relative bg-black">
        <button onClick={handleInternalBack} className="absolute top-6 left-6 p-3 rounded-full glass-button text-slate-300 hover:text-white z-20">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-full max-w-md text-center">
          <div className="mb-10">
            <div className="w-24 h-24 rounded-full bg-accent-500/10 border-2 border-accent-500 flex items-center justify-center mx-auto mb-6 relative">
              <Fingerprint className="w-10 h-10 text-accent-500 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-accent-500/50 animate-ping" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Scanner Active</h2>
            <p className="text-slate-400">Ready for biometric input...</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400 text-sm font-bold uppercase">Session</span>
              <span className="text-white font-mono">{activeSessionId.split('-')[0]}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold uppercase">Attendees</span>
              <span className="text-green-400 font-bold text-2xl">{attendanceRecords.length}</span>
            </div>
          </div>

          {/* Hidden form to capture scanner input */}
          <form onSubmit={handleBiometricSubmit} className="relative">
            <div className="absolute inset-0 bg-transparent z-10 cursor-text" onClick={() => scannerInputRef.current?.focus()}></div>
            <input 
              ref={scannerInputRef}
              type="text" 
              value={scannerInput} 
              onChange={(e) => setScannerInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-all text-base"
              placeholder="Waiting for input..."
              autoFocus
              onBlur={() => setTimeout(() => scannerInputRef.current?.focus(), 100)} // Keep focus
            />
          </form>

          {lastBioScannedStudent && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-3 text-green-400"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="font-bold">Verified: {lastBioScannedStudent}</span>
            </motion.div>
          )}

          {/* Live Attendance List */}
          {attendanceRecords.length > 0 && (
            <div className="mt-8 glass-panel rounded-2xl p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <UserCheck className="w-5 h-5 text-accent-400" />
                <h3 className="font-bold text-white">Present ({attendanceRecords.length})</h3>
              </div>
              
              <div className="space-y-2">
                {attendanceRecords.slice(0, 10).map((record, idx) => (
                  <div
                    key={`${record.studentId}-${idx}`}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{record.studentName || record.studentId}</p>
                      <p className="text-xs text-slate-400 font-mono">{record.studentId}</p>
                    </div>
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: SCANNER ---
  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      
      {/* Video Background */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start pointer-events-auto">
          <button 
            onClick={handleInternalBack}
            className="p-3 rounded-full bg-black/50 backdrop-blur-xl text-white border border-white/10 hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-end gap-2">
            <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-sm font-bold shadow-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              {attendanceRecords.length} / {selectedCourse?.totalStudents}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-brand-500/20 backdrop-blur-md border border-brand-500/30 text-brand-200 text-xs font-bold shadow-lg">
              {sessionName}
            </div>
          </div>
        </div>

        {/* Center Scan Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-80 h-80 relative rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Scanner Frame */}
            <div className="absolute inset-0 rounded-3xl border-4 border-white/30" />
            <div className="absolute inset-0 rounded-3xl border-4 border-brand-400 [mask-image:linear-gradient(to_bottom,black_20%,transparent_20%,transparent_80%,black_80%),linear-gradient(to_right,black_20%,transparent_20%,transparent_80%,black_80%)] [mask-composite:intersect]" />
            
            {/* Scanning Line */}
            {isScanning && !lastScannedStudent && (
              <motion.div 
                className="absolute left-0 right-0 h-40 bg-gradient-to-b from-brand-400/60 to-transparent"
                animate={{ top: ['-40%', '100%'] }}
                transition={{ duration: 2, ease: "linear", repeat: Infinity }}
              />
            )}

            {/* Success/Error Flash */}
            <AnimatePresence>
              {lastScannedStudent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute inset-0 ${lastScannedStudent.success ? 'bg-green-500/30' : 'bg-red-500/30'}`}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="text-center pointer-events-auto space-y-4 pb-8">
          {lastScannedStudent && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl backdrop-blur-md border ${
                lastScannedStudent.success 
                  ? 'bg-green-500/20 border-green-400/30 text-green-300'
                  : 'bg-red-500/20 border-red-400/30 text-red-300'
              }`}
            >
              {lastScannedStudent.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span className="font-bold">
                {lastScannedStudent.name || lastScannedStudent.id}
              </span>
            </motion.div>
          )}
          
          <div className="inline-block px-6 py-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10">
            <p className="text-white font-medium">{scanMessage}</p>
          </div>
        </div>
      </div>

      {/* Attendance List Sidebar */}
      {attendanceRecords.length > 0 && (
        <div className="absolute right-6 top-24 bottom-6 w-80 glass-panel rounded-2xl p-4 overflow-y-auto pointer-events-auto z-30 max-h-[calc(100vh-12rem)]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <UserCheck className="w-5 h-5 text-brand-400" />
            <h3 className="font-bold text-white">Present ({attendanceRecords.length})</h3>
          </div>
          
          <div className="space-y-2">
            {attendanceRecords.map((record, idx) => (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={`${record.studentId}-${idx}`}
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{record.studentName || record.studentId}</p>
                    <p className="text-xs text-slate-400 font-mono">{record.studentId}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(record.timestamp).toLocaleTimeString()}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerScanner;
