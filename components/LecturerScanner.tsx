import React, { useEffect, useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { saveAttendance, createSession, getSessionHistory, getAttendanceForSession, loginLecturer, logoutLecturer } from '../services/attendanceService';
import { fingerprintService, FingerprintTemplate } from '../services/fingerprintService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, GraduationCap, BookOpen, ShieldCheck, Users, Calendar,
  FileText, Type, LogOut, Check, X, Camera, History, UserCheck, Fingerprint,
  QrCode as QrCodeIcon, UserPlus, Search, CheckCircle2, AlertCircle, WifiOff, Loader2
} from 'lucide-react';
import type { Course } from '../types/course';
import type { LecturerProfile } from '../types/user';


interface ScannerCourse {
  id: string;
  name: string;
  desc: string;
  totalStudents: number;
  courseCode: string;
  courseName: string;
  department?: string;
  semesterId?: string;
  semesterName?: string;
  lecturerId?: string;
  lecturerName?: string;
}

const AVAILABLE_COURSES: ScannerCourse[] = [
  { id: 'CS-404', name: 'Network Security',   desc: 'Protocol Analysis',              totalStudents: 42, courseCode: 'CS-404', courseName: 'Network Security' },
  { id: 'CS-302', name: 'Algorithms II',       desc: 'Data Structures',                totalStudents: 82, courseCode: 'CS-302', courseName: 'Algorithms II' },
  { id: 'ETH-101', name: 'Cyber Ethics',       desc: 'Legal Frameworks',               totalStudents: 35, courseCode: 'ETH-101', courseName: 'Cyber Ethics' },
  { id: 'CS-402', name: 'Kernel Arch',         desc: 'System Design',                  totalStudents: 18, courseCode: 'CS-402', courseName: 'Kernel Arch' },
  { id: 'CS-309', name: 'Intro to AI',         desc: 'Machine Learning Basics',        totalStudents: 25, courseCode: 'CS-309', courseName: 'Intro to AI' },
  { id: 'CS-410', name: 'Cloud Security',      desc: 'Securing Cloud Infrastructures', totalStudents: 30, courseCode: 'CS-410', courseName: 'Cloud Security' },
  { id: 'CS-305', name: 'Database Systems',    desc: 'SQL & NoSQL Databases',          totalStudents: 40, courseCode: 'CS-305', courseName: 'Database Systems' },
  { id: 'CS-315', name: 'Web Dev',             desc: 'Full Stack Development',         totalStudents: 38, courseCode: 'CS-315', courseName: 'Web Dev' },
];


enum LecturerStep {
  AUTH             = 'AUTH',
  SELECT           = 'SELECT',
  COURSE_DASHBOARD = 'COURSE_DASHBOARD',
  HISTORY          = 'HISTORY',
  CREATE_SESSION   = 'CREATE_SESSION',
  MODE_SELECT      = 'MODE_SELECT',
  SCANNER          = 'SCANNER',
  BIO_SCANNER      = 'BIO_SCANNER',
  ENROLL           = 'ENROLL',
}

type EnrollPhase =
  | 'search'       // Lecturer enters student ID + name
  | 'confirm'      // Show student details, ready to scan
  | 'scanning'     // Actively scanning finger (shows which scan # out of 3)
  | 'done'         // Enrollment complete
  | 'already'      // Student already enrolled
  | 'error';       // Something went wrong

type BioPhase =
  | 'idle'         // Waiting, scanner initialized
  | 'connecting'   // Initializing service
  | 'scanning'     // Finger being scanned
  | 'matching'     // Comparing against Firestore templates
  | 'success'      // Match found, attendance logged
  | 'no_match'     // No match found
  | 'duplicate'    // Already marked present
  | 'error'        // Scanner/service error
  | 'no_device';   // Device not connected

interface StudentQRPayload {
  studentId: string;
  studentUid?: string;
  studentName?: string;
  courseId: string;
  courseCode?: string;
  courseName: string;
  semesterId?: string;
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
  initialLecturer?: LecturerProfile | null;
  initialCourse?: Course | null;
  initialMode?: 'default' | 'enroll';
  onLecturerLogout?: () => void;
}

// Semester-aware scanner bridge: dashboard-selected Firestore courses are mapped into the existing scanner UI shape.
const mapCourseToScannerCourse = (course: Course): ScannerCourse => ({
  id: course.id,
  name: course.course_name,
  desc: course.description || course.department,
  totalStudents: course.enrolled_count,
  courseCode: course.course_code,
  courseName: course.course_name,
  department: course.department,
  semesterId: course.semester_id,
  semesterName: course.semester_name,
  lecturerId: course.lecturer_id,
  lecturerName: course.lecturer_name,
});

// ─── Component ────────────────────────────────────────────────────────────────

const LecturerScanner: React.FC<LecturerScannerProps> = ({
  onBack,
  initialLecturer = null,
  initialCourse = null,
  initialMode = 'default',
  onLecturerLogout,
}) => {
  const initialScannerCourse = initialCourse ? mapCourseToScannerCourse(initialCourse) : null;
  const openFingerprintEnrollment =
    initialMode === 'enroll' && Boolean(initialLecturer) && !initialScannerCourse;

  // ── Auth & Navigation ──
  const [step, setStep]           = useState<LecturerStep>(
    openFingerprintEnrollment
      ? LecturerStep.ENROLL
      : initialScannerCourse
        ? LecturerStep.COURSE_DASHBOARD
        : initialLecturer
          ? LecturerStep.SELECT
          : LecturerStep.AUTH
  );
  const [lecturerId, setLecturerId] = useState(initialLecturer?.email ?? '');
  const [password, setPassword]   = useState('');
  const [selectedCourse, setSelectedCourse] = useState<ScannerCourse | null>(initialScannerCourse);

  // ── Session ──
  const [sessionName, setSessionName]   = useState('');
  const [sessionDate, setSessionDate]   = useState('');
  const [sessionDesc, setSessionDesc]   = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [selectedHistorySessionDetails, setSelectedHistorySessionDetails] = useState<any | null>(null);
  const [historyAttendanceRecords, setHistoryAttendanceRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── QR Scanner ──
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning]           = useState(false);
  const isScanningRef                         = useRef<boolean>(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const attendanceRecordsRef                  = useRef<AttendanceRecord[]>([]);
  const [lastScannedStudent, setLastScannedStudent] = useState<{ id: string; name?: string; success: boolean } | null>(null);
  const [scanMessage, setScanMessage]         = useState<string>('Position QR code in frame');

  // ── Duplicate Prevention ──
  const lastScanTimeRef           = useRef<number>(0);
  const scannedNoncesRef          = useRef<Set<string>>(new Set());
  const processingNoncesRef       = useRef<Set<string>>(new Set());
  const processingStudentIdsRef   = useRef<Set<string>>(new Set());
  const selectedCourseRef         = useRef<ScannerCourse | null>(initialScannerCourse);
  const activeSessionIdRef        = useRef<string>('');

  // ── Biometric Attendance ──
  const [bioPhase, setBioPhase]       = useState<BioPhase>('connecting');
  const [bioMessage, setBioMessage]   = useState('');
  const [lastBioStudent, setLastBioStudent] = useState<{ id: string; name?: string } | null>(null);
  const bioInitialized                = useRef(false);

  // ── Enrollment ──
  const [enrollPhase, setEnrollPhase]       = useState<EnrollPhase>('search');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollStudentName, setEnrollStudentName] = useState('');
  const [enrollScanCount, setEnrollScanCount] = useState(0);
  const [enrollError, setEnrollError]       = useState('');
  const ENROLL_TOTAL = 3;

  // ── Sync refs ──
  useEffect(() => { attendanceRecordsRef.current = attendanceRecords; }, [attendanceRecords]);
  useEffect(() => { selectedCourseRef.current = selectedCourse; }, [selectedCourse]);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  
  // Biometric: initialize service when entering BIO_SCANNER step
  useEffect(() => {
    if (step !== LecturerStep.BIO_SCANNER) {
      bioInitialized.current = false;
      return;
    }

    let cancelled = false;

    const init = async () => {
      setBioPhase('connecting');
      setBioMessage('Connecting to fingerprint scanner...');
      const ok = await fingerprintService.initialize();
      if (cancelled) return;
      if (ok) {
        setBioPhase('idle');
        setBioMessage('Place finger on scanner to mark attendance');
        bioInitialized.current = true;
      } else {
        setBioPhase('no_device');
        setBioMessage('Scanner not detected. Check USB connection.');
      }
    };

    init();

    return () => {
      cancelled = true;
      fingerprintService.dispose();
      bioInitialized.current = false;
    };
  }, [step]);

  // Navigation
  const handleInternalBack = () => {
    switch (step) {
      case LecturerStep.SCANNER:
      case LecturerStep.BIO_SCANNER:
        stopStream();
        fingerprintService.dispose();
        setStep(LecturerStep.MODE_SELECT);
        setAttendanceRecords([]);
        scannedNoncesRef.current.clear();
        processingNoncesRef.current.clear();
        processingStudentIdsRef.current.clear();
        break;
      case LecturerStep.ENROLL:
        resetEnroll();
        if (openFingerprintEnrollment) {
          onBack();
        } else {
          setStep(initialScannerCourse ? LecturerStep.COURSE_DASHBOARD : LecturerStep.SELECT);
        }
        break;
      case LecturerStep.MODE_SELECT:
      case LecturerStep.CREATE_SESSION:
      case LecturerStep.HISTORY:
        setStep(LecturerStep.COURSE_DASHBOARD);
        break;
      case LecturerStep.COURSE_DASHBOARD:
        if (initialScannerCourse || initialLecturer) {
          onBack();
        } else {
          setStep(LecturerStep.SELECT);
        }
        break;
      case LecturerStep.SELECT:
        if (initialLecturer) {
          onBack();
        } else {
          setStep(LecturerStep.AUTH);
        }
        break;
      default:
        onBack();
    }
  };

  const handleLogout = async () => {
    await logoutLecturer();
    setLecturerId('');
    setPassword('');
    setSelectedCourse(null);
    if (onLecturerLogout) {
      onLecturerLogout();
    } else if (initialLecturer) {
      onBack();
    } else {
      setStep(LecturerStep.AUTH);
    }
  };

  // Auth
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginLecturer(lecturerId, password);
      setStep(openFingerprintEnrollment ? LecturerStep.ENROLL : LecturerStep.SELECT);
    } catch {
      alert('Invalid credentials');
    }
  };

 
  // Session Management
  const handleCourseSelect = (course: typeof AVAILABLE_COURSES[0]) => {
    setSelectedCourse(course);
    setStep(LecturerStep.COURSE_DASHBOARD);
  };

  const handleStartCreateSession = () => {
    if (!selectedCourse) return;
    setSessionName(`Lecture: ${selectedCourse.courseName}`);
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
    } catch {
      setHistorySessions([]);
    }
  };

  const handleOpenSessionDetails = async (session: any) => {
    setHistoryLoading(true);
    try {
      const records = await getAttendanceForSession(session.session_id || session.id);
      setHistoryAttendanceRecords(records);
      setSelectedHistorySessionDetails(session);
    } catch {
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

    const newSessionId = `${selectedCourse.courseCode || selectedCourse.id}-${Date.now().toString(36)}`;
    setActiveSessionId(newSessionId);

    try {
      await createSession({
        session_id: newSessionId,
        course_id: selectedCourse.id,
        course_code: selectedCourse.courseCode,
        course_name: selectedCourse.courseName,
        semester_id: selectedCourse.semesterId,
        lecturer_id: selectedCourse.lecturerId,
        lecturer_name: selectedCourse.lecturerName,
        name: sessionName,
        description: sessionDesc,
        date: sessionDate,
        created_at: new Date().toISOString(),
      });
    } catch {
      console.warn('Backend session sync skipped');
    }

    setAttendanceRecords([]);
    scannedNoncesRef.current.clear();
    processingNoncesRef.current.clear();
    processingStudentIdsRef.current.clear();
    setStep(LecturerStep.MODE_SELECT);
  };

  // Biometric Attendance — scan finger → match → log
  const handleBioScan = useCallback(async () => {
    if (!bioInitialized.current || bioPhase === 'scanning' || bioPhase === 'matching') return;

    setBioPhase('scanning');
    setBioMessage('Scanning... keep finger still');
    setLastBioStudent(null);

    try {
      // Step 1: Capture fingerprint
      const template = await fingerprintService.captureSingle();

      // Step 2: Match against enrolled students
      setBioPhase('matching');
      setBioMessage('Identifying student...');

      const result = await fingerprintService.verifyAndMatch(template, activeSessionIdRef.current);

      if (!result.matched || !result.studentId) {
        setBioPhase('no_match');
        setBioMessage('No match found. Student may not be enrolled.');
        setTimeout(() => { setBioPhase('idle'); setBioMessage('Place finger on scanner to mark attendance'); }, 3000);
        return;
      }

      // Step 3: Check for duplicate attendance
      const alreadyMarked = attendanceRecordsRef.current.some(r => r.studentId === result.studentId);
      if (alreadyMarked) {
        setBioPhase('duplicate');
        setBioMessage(`${result.studentName || result.studentId} is already marked present`);
        setLastBioStudent({ id: result.studentId!, name: result.studentName });
        setTimeout(() => { setBioPhase('idle'); setBioMessage('Place finger on scanner to mark attendance'); }, 3000);
        return;
      }

      // Step 4: Log attendance
      await saveAttendance(
        activeSessionIdRef.current,
        result.studentId,
        result.studentName,
        `BIO-${Date.now()}`,
        null,
        {
          courseId: selectedCourseRef.current?.id,
          courseCode: selectedCourseRef.current?.courseCode,
          courseName: selectedCourseRef.current?.courseName,
          semesterId: selectedCourseRef.current?.semesterId,
        }
      );

      const record: AttendanceRecord = {
        studentId: result.studentId,
        studentName: result.studentName,
        timestamp: new Date().toISOString(),
      };

      setAttendanceRecords(prev => [record, ...prev]);
      setLastBioStudent({ id: result.studentId!, name: result.studentName });
      setBioPhase('success');
      setBioMessage(`✓ ${result.studentName || result.studentId} marked present`);

      // Reset after 3 seconds for next student
      setTimeout(() => {
        setBioPhase('idle');
        setBioMessage('Place finger on scanner to mark attendance');
        setLastBioStudent(null);
      }, 3000);

    } catch (err: any) {
      setBioPhase('error');
      setBioMessage(err.message || 'Scan failed. Try again.');
      setTimeout(() => { setBioPhase('idle'); setBioMessage('Place finger on scanner to mark attendance'); }, 3000);
    }
  }, [bioPhase]);

  // Enrollment Flow
  const resetEnroll = () => {
    setEnrollPhase('search');
    setEnrollStudentId('');
    setEnrollStudentName('');
    setEnrollScanCount(0);
    setEnrollError('');
    fingerprintService.dispose();
  };

  const handleEnrollSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId.trim() || !enrollStudentName.trim()) return;

    setEnrollError('');

    // Check if already enrolled
    const already = await fingerprintService.isEnrolled(enrollStudentId.trim().toUpperCase());
    if (already) {
      setEnrollPhase('already');
      return;
    }

    setEnrollPhase('confirm');
  };

  const handleStartEnrollScanning = async () => {
    setEnrollError('');
    setEnrollScanCount(0);

    const ok = await fingerprintService.initialize();
    if (!ok) {
      setEnrollError('Could not connect to fingerprint scanner. Check USB connection.');
      setEnrollPhase('error');
      return;
    }

    setEnrollPhase('scanning');

    try {
      await fingerprintService.enrollStudent(
        enrollStudentId.trim().toUpperCase(),
        enrollStudentName.trim(),
        (scan, total) => {
          setEnrollScanCount(scan - 1); // show progress as scans complete
        }
      );
      setEnrollScanCount(ENROLL_TOTAL);
      setEnrollPhase('done');
    } catch (err: any) {
      setEnrollError(err.message || 'Enrollment failed. Please try again.');
      setEnrollPhase('error');
    }
  };

  
  // QR Camera
  
  const stopStream = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    isScanningRef.current = false;
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (isScanningRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        isScanningRef.current = true;
        setIsScanning(true);
        setScanMessage('Position QR code in frame');
        requestAnimationFrame(tick);
      }
    } catch {
      setScanMessage('Could not access camera');
    }
  }, [stopStream]);

  const tick = () => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;
    if (!video?.srcObject) { isScanningRef.current = false; setIsScanning(false); setTimeout(() => startScanning(), 100); return; }
    if (video.readyState < video.HAVE_CURRENT_DATA) { requestAnimationFrame(tick); return; }
    const canvas = canvasRef.current;
    if (canvas && video.videoHeight > 0) {
      canvas.height = video.videoHeight;
      canvas.width  = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) handleScanSuccess(code.data);
      }
    }
    if (isScanningRef.current) requestAnimationFrame(tick);
  };

  const handleScanSuccess = async (data: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) return;
    try {
      const payload: StudentQRPayload = JSON.parse(data);
      if (!payload.studentId || !payload.courseId || !payload.nonce) { setScanMessage('Invalid QR code format'); return; }
      if (scannedNoncesRef.current.has(payload.nonce) || processingNoncesRef.current.has(payload.nonce)) { setScanMessage('Already scanned!'); setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false }); setTimeout(() => setLastScannedStudent(null), 2000); return; }
      if (selectedCourseRef.current && payload.courseId !== selectedCourseRef.current.id) { setScanMessage('Wrong course QR code'); setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false }); setTimeout(() => setLastScannedStudent(null), 2000); return; }
      if (attendanceRecordsRef.current.some(r => r.studentId === payload.studentId) || processingStudentIdsRef.current.has(payload.studentId)) { setScanMessage('Student already marked present'); setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: false }); setTimeout(() => setLastScannedStudent(null), 2000); return; }

      processingNoncesRef.current.add(payload.nonce);
      processingStudentIdsRef.current.add(payload.studentId);
      lastScanTimeRef.current = now;

      await saveAttendance(
        activeSessionIdRef.current,
        payload.studentId,
        payload.studentName,
        payload.nonce,
        payload.studentUid || null,
        {
          courseId: payload.courseId || selectedCourseRef.current?.id,
          courseCode: payload.courseCode || selectedCourseRef.current?.courseCode,
          courseName: payload.courseName || selectedCourseRef.current?.courseName,
          semesterId: payload.semesterId || selectedCourseRef.current?.semesterId,
        }
      );
      setAttendanceRecords(prev => [{ studentId: payload.studentId, studentName: payload.studentName, timestamp: new Date().toISOString() }, ...prev]);
      scannedNoncesRef.current.add(payload.nonce);
      processingNoncesRef.current.delete(payload.nonce);
      processingStudentIdsRef.current.delete(payload.studentId);
      setScanMessage(`✓ ${payload.studentName || payload.studentId} marked present`);
      setLastScannedStudent({ id: payload.studentId, name: payload.studentName, success: true });
      setTimeout(() => { setScanMessage('Position QR code in frame'); setLastScannedStudent(null); }, 3000);
    } catch {
      setScanMessage('Invalid QR code');
      setLastScannedStudent({ id: 'Error', success: false });
      setTimeout(() => setLastScannedStudent(null), 2000);
    }
  };

  useEffect(() => {
    if (step === LecturerStep.SCANNER) startScanning();
    else stopStream();
    return () => stopStream();
  }, [step, startScanning, stopStream]);

  
  // RENDER: AUTH
  
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
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Lecturer ID (Email)</label>
                <input type="text" value={lecturerId} onChange={e => setLecturerId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-mono" placeholder="lecturer@babcock.com" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" placeholder="••••••••" required />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/30 transition-all hover:scale-[1.02] mt-8">Continue</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  
  // RENDER: SESSION HISTORY MODAL
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
            <button onClick={handleCloseSessionDetails} className="p-2 rounded-full glass-button text-slate-300"><X className="w-5 h-5" /></button>
          </div>
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
                  <div className="text-xs text-slate-500">{new Date(typeof rec.timestamp === 'string' ? rec.timestamp : rec.timestamp?.seconds * 1000).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

 // RENDER: SELECT COURSE
if (step === LecturerStep.SELECT) {
  return (
    <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
      <div className="flex items-center gap-4 mb-8 pt-2 z-10">
        <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1"><h2 className="text-2xl font-bold text-white leading-none">Dashboard</h2><span className="text-sm text-slate-400 font-mono">{lecturerId}</span></div>
        <button onClick={handleLogout} className="p-3 rounded-full glass-button text-red-400 hover:text-red-300"><LogOut className="w-5 h-5" /></button>
      </div>

      <div className="flex flex-col gap-8 max-w-lg mx-auto w-full z-10">

        {/* ── ATTENDANCE SECTION ── */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Attendance</p>
          <div className="flex flex-col gap-3">
            {AVAILABLE_COURSES.map((course, idx) => (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={course.id} onClick={() => handleCourseSelect(course)} className="glass-panel p-5 rounded-2xl text-left hover:bg-white/5 transition-all group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300"><BookOpen className="w-6 h-6" /></div>
                  <div><h3 className="font-bold text-lg text-white mb-1">{course.name}</h3><p className="text-sm text-slate-400 font-mono">{course.id} • {course.totalStudents} students</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── MANAGEMENT SECTION ── */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Management</p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => { resetEnroll(); setStep(LecturerStep.ENROLL); }}
            className="w-full glass-panel p-5 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300"><UserPlus className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-lg text-white mb-1">Enroll Students</h3><p className="text-sm text-slate-400">Register fingerprints for biometric attendance</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </motion.button>
        </div>

      </div>
    </div>
  );
}

  // RENDER: COURSE DASHBOARD  (added Enroll Students button)

  if (step === LecturerStep.COURSE_DASHBOARD) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><h2 className="text-2xl font-bold text-white leading-none">{selectedCourse?.courseName}</h2><span className="text-sm text-brand-400 font-medium">{selectedCourse?.courseCode || selectedCourse?.id}</span></div>
          <button onClick={handleLogout} className="p-3 rounded-full glass-button text-red-400 hover:text-red-300"><LogOut className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10">
          {/* Start Scanner */}
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleStartCreateSession} className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform"><Camera className="w-7 h-7" /></div>
                <div><h3 className="font-bold text-xl text-white mb-1">Start Scanner</h3><p className="text-sm text-slate-400">Create new attendance session</p></div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>

          {/* Session History */}
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onClick={handleViewHistory} className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><History className="w-7 h-7" /></div>
                <div><h3 className="font-bold text-xl text-white mb-1">Session History</h3><p className="text-sm text-slate-400">View past attendance records</p></div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // RENDER: ENROLL STUDENTS
  
  if (step === LecturerStep.ENROLL) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><h2 className="text-2xl font-bold text-white leading-none">Enroll Students</h2><span className="text-sm text-emerald-400 font-medium">Fingerprint Registration</span></div>
        </div>

        <div className="max-w-md mx-auto w-full z-10">

          {/* ── SEARCH PHASE ── */}
          {enrollPhase === 'search' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-slate-400 mb-6 text-sm">Enter the student's details to begin fingerprint enrollment.</p>
              <form onSubmit={handleEnrollSearch} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Student ID</label>
                  <input type="text" value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono uppercase" placeholder="e.g 20/2726" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Full Name</label>
                  <input type="text" value={enrollStudentName} onChange={e => setEnrollStudentName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" placeholder="" required />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" /> Check & Continue
                </button>
              </form>
            </motion.div>
          )}

          {/* ── ALREADY ENROLLED ── */}
          {enrollPhase === 'already' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/50 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Already Enrolled</h3>
              <p className="text-slate-400 mb-2"><span className="text-white font-mono">{enrollStudentId.toUpperCase()}</span> already has a registered fingerprint.</p>
              <p className="text-slate-500 text-sm mb-8">If you need to re-enroll, please contact your system administrator.</p>
              <button onClick={resetEnroll} className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/15 transition-colors">Enroll Another Student</button>
            </motion.div>
          )}

          {/* ── CONFIRM PHASE ── */}
          {enrollPhase === 'confirm' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="glass-panel p-6 rounded-2xl mb-6 text-left">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5 text-emerald-400" /> Student Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-slate-400 text-sm">Student ID</span><span className="text-white font-mono font-bold">{enrollStudentId.toUpperCase()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 text-sm">Name</span><span className="text-white font-semibold">{enrollStudentName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 text-sm">Scans Required</span><span className="text-emerald-400 font-bold">{ENROLL_TOTAL} fingerprints</span></div>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-6">The student will need to place their finger on the scanner <strong className="text-white">{ENROLL_TOTAL} times</strong></p>
              <div className="flex gap-3">
                <button onClick={() => setEnrollPhase('search')} className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-semibold hover:bg-white/10 transition-colors">Back</button>
                <button onClick={handleStartEnrollScanning} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                  <Fingerprint className="w-5 h-5" /> Start Scanning
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SCANNING PHASE ── */}
          {enrollPhase === 'scanning' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              {/* Progress dots */}
              <div className="flex justify-center gap-3 mb-8">
                {Array.from({ length: ENROLL_TOTAL }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-500 ${i < enrollScanCount ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-white/10 border border-white/20'}`}
                    animate={i === enrollScanCount ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                ))}
              </div>

              {/* Fingerprint animation */}
              <div className="relative w-36 h-36 mx-auto mb-8">
                <motion.div className="absolute inset-0 rounded-full border-2 border-emerald-500/40" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <motion.div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" animate={{ scale: [1, 1.8], opacity: [0.4, 0] }} transition={{ duration: 1.5, delay: 0.4, repeat: Infinity }} />
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
                  <Fingerprint className="w-16 h-16 text-emerald-400 animate-pulse" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Scan {enrollScanCount + 1} of {ENROLL_TOTAL}
              </h3>
              <p className="text-slate-400 mb-2">Ask <span className="text-white font-semibold">{enrollStudentName}</span> to place their finger on the scanner</p>
            </motion.div>
          )}

          {/* ── DONE PHASE ── */}
          {enrollPhase === 'done' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Enrollment Complete!</h3>
              <p className="text-slate-400 mb-1"><span className="text-emerald-400 font-bold">{enrollStudentName}</span> is now registered.</p>
              <p className="text-slate-500 text-sm mb-8">They can now use their fingerprint for biometric attendance.</p>
              <div className="flex gap-3">
                <button onClick={resetEnroll} className="flex-1 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-semibold hover:bg-emerald-500/20 transition-colors">Enroll Another</button>
                <button onClick={handleInternalBack} className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-semibold hover:bg-white/10 transition-colors">Done</button>
              </div>
            </motion.div>
          )}

          {/* ── ERROR PHASE ── */}
          {enrollPhase === 'error' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Enrollment Failed</h3>
              <p className="text-red-400 text-sm mb-8">{enrollError}</p>
              <button onClick={() => setEnrollPhase('confirm')} className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/15 transition-colors">Try Again</button>
            </motion.div>
          )}

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: CREATE SESSION
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === LecturerStep.CREATE_SESSION) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-2xl font-bold text-white">Create Session</h2>
        </div>
        <form onSubmit={handleCreateSessionSubmit} className="max-w-lg mx-auto w-full space-y-6 z-10">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2"><Type className="w-4 h-4" /> Session Name</label>
            <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2"><FileText className="w-4 h-4" /> Description <span className="text-slate-500 font-normal">(Optional)</span></label>
            <textarea value={sessionDesc} onChange={e => setSessionDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none" rows={3} placeholder="Add session details..." />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/30 transition-all hover:scale-[1.02] mt-8">Start Scanning Session</button>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: HISTORY
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === LecturerStep.HISTORY) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-2xl font-bold text-white">Session History</h2>
        </div>
        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10 pb-10">
          {historySessions.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center"><History className="w-12 h-12 text-slate-600 mx-auto mb-4" /><p className="text-slate-400">No session history found.</p></div>
          ) : historySessions.map((session, idx) => (
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={session.id} onClick={() => handleOpenSessionDetails(session)} className="glass-panel p-5 rounded-2xl text-left hover:bg-white/5 transition-all">
              <h3 className="font-bold text-white text-lg mb-2">{session.name}</h3>
              <p className="text-slate-400 text-sm mb-3">{session.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 font-mono"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {session.date}</span></div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: MODE SELECT
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === LecturerStep.MODE_SELECT) {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6 relative overflow-hidden bg-dark-bg">
        <div className="flex items-center gap-4 mb-8 pt-2 z-10">
          <button onClick={handleInternalBack} className="p-3 rounded-full glass-button text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><h2 className="text-2xl font-bold text-white leading-none">Attendance Mode</h2><span className="text-sm text-brand-400 font-medium">{sessionName}</span></div>
          <button onClick={handleLogout} className="p-3 rounded-full glass-button text-red-400 hover:text-red-300"><LogOut className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full z-10">
          <p className="text-slate-400 text-center mb-4">Choose how students will mark attendance</p>
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setStep(LecturerStep.SCANNER)} className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform"><QrCodeIcon className="w-8 h-8" /></div>
                <div><h3 className="font-bold text-xl text-white mb-1">QR Code Camera</h3><p className="text-sm text-slate-400">Scan student-generated QR codes</p></div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onClick={() => setStep(LecturerStep.BIO_SCANNER)} className="glass-panel p-6 rounded-2xl text-left hover:bg-white/5 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center text-accent-400 group-hover:scale-110 transition-transform"><Fingerprint className="w-8 h-8" /></div>
                <div><h3 className="font-bold text-xl text-white mb-1">Biometric System</h3><p className="text-sm text-slate-400">DigitalPersona fingerprint scanner</p></div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: BIOMETRIC ATTENDANCE  (real DigitalPersona scanning)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === LecturerStep.BIO_SCANNER) {

    const iconColor =
      bioPhase === 'success'    ? 'text-green-400'  :
      bioPhase === 'no_match'   ? 'text-red-400'    :
      bioPhase === 'duplicate'  ? 'text-yellow-400' :
      bioPhase === 'error'      ? 'text-red-400'    :
      bioPhase === 'no_device'  ? 'text-slate-500'  :
                                  'text-accent-400';

    const ringColor =
      bioPhase === 'success'    ? 'border-green-500'  :
      bioPhase === 'no_match'   ? 'border-red-500'    :
      bioPhase === 'duplicate'  ? 'border-yellow-500' :
      bioPhase === 'error'      ? 'border-red-500'    :
      bioPhase === 'no_device'  ? 'border-slate-600'  :
                                  'border-accent-500';

    const canScan = bioPhase === 'idle' && bioInitialized.current;

    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 relative bg-dark-bg">
        <button onClick={handleInternalBack} className="absolute top-6 left-6 p-3 rounded-full glass-button text-slate-300 hover:text-white z-20">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-full max-w-md text-center">
          <div className="mb-10">

            {/* Scanner icon */}
            <button
              onClick={handleBioScan}
              disabled={!canScan}
              className="relative w-36 h-36 mx-auto mb-6 outline-none group disabled:cursor-not-allowed block"
            >
              {/* Pulse rings when idle/ready */}
              {(bioPhase === 'idle') && (
                <>
                  <motion.div className={`absolute inset-0 rounded-full border ${ringColor}`} animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                  <motion.div className={`absolute inset-0 rounded-full border ${ringColor}`} animate={{ scale: [1, 1.3], opacity: [0.3, 0] }} transition={{ duration: 2, delay: 0.6, repeat: Infinity }} />
                </>
              )}

              {/* Faster pulse when scanning */}
              {(bioPhase === 'scanning' || bioPhase === 'matching') && (
                <motion.div className="absolute inset-0 rounded-full border border-accent-500" animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 0.8, repeat: Infinity }} />
              )}

              <div className={`absolute inset-0 rounded-full border-2 ${ringColor} flex items-center justify-center transition-all duration-300 ${bioPhase === 'success' ? 'bg-green-500/10' : 'bg-white/5'}`}>
                {bioPhase === 'connecting'                    && <Loader2  className="w-14 h-14 text-slate-400 animate-spin" />}
                {bioPhase === 'success'                       && <CheckCircle2 className="w-14 h-14 text-green-400" />}
                {bioPhase === 'no_device'                     && <WifiOff  className={`w-14 h-14 ${iconColor}`} />}
                {bioPhase === 'error' || bioPhase === 'no_match' ? <AlertCircle className={`w-14 h-14 ${iconColor}`} /> : null}
                {(bioPhase === 'idle' || bioPhase === 'scanning' || bioPhase === 'matching' || bioPhase === 'duplicate') && (
                  <Fingerprint className={`w-14 h-14 ${iconColor} ${bioPhase === 'scanning' ? 'animate-pulse' : ''}`} />
                )}
              </div>
            </button>

            <h2 className="text-3xl font-bold text-white mb-2">
              {bioPhase === 'connecting' ? 'Connecting...'  :
               bioPhase === 'success'    ? 'Verified!'      :
               bioPhase === 'no_match'  ? 'Not Found'       :
               bioPhase === 'duplicate' ? 'Already Present' :
               bioPhase === 'no_device' ? 'No Device'       :
               bioPhase === 'error'     ? 'Scan Error'      :
                                          'Scanner Active'}
            </h2>
            <p className={`font-medium ${bioPhase === 'success' ? 'text-green-400' : bioPhase === 'no_match' || bioPhase === 'error' ? 'text-red-400' : bioPhase === 'duplicate' ? 'text-yellow-400' : 'text-slate-400'}`}>
              {bioMessage}
            </p>
          </div>

          {/* Session info */}
          <div className="glass-panel p-5 rounded-2xl mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm font-bold uppercase">Session</span>
              <span className="text-white font-mono text-sm">{activeSessionId.split('-')[0]}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold uppercase">Present</span>
              <span className="text-green-400 font-bold text-2xl">{attendanceRecords.length}</span>
            </div>
          </div>

          {/* Last verified student */}
          <AnimatePresence>
            {lastBioStudent && bioPhase === 'success' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-3 text-green-400">
                <ShieldCheck className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-bold">{lastBioStudent.name || lastBioStudent.id}</p>
                  {lastBioStudent.name && <p className="text-xs font-mono text-green-500/70">{lastBioStudent.id}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tap hint */}
          {bioPhase === 'idle' && (
            <p className="text-slate-500 text-sm animate-pulse">Tap the fingerprint icon or place finger on scanner</p>
          )}

          {/* Live attendance list */}
          {attendanceRecords.length > 0 && (
            <div className="mt-6 glass-panel rounded-2xl p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <UserCheck className="w-5 h-5 text-accent-400" />
                <h3 className="font-bold text-white">Present ({attendanceRecords.length})</h3>
              </div>
              <div className="space-y-2">
                {attendanceRecords.slice(0, 10).map((record, idx) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={`${record.studentId}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{record.studentName || record.studentId}</p>
                      <p className="text-xs text-slate-400 font-mono">{record.studentId}</p>
                    </div>
                    <Check className="w-4 h-4 text-green-400" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDER: QR SCANNER

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={handleInternalBack} className="p-3 rounded-full bg-black/50 backdrop-blur-xl text-white border border-white/10 hover:bg-black/60 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <div className="flex flex-col items-end gap-2">
            <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-sm font-bold shadow-lg flex items-center gap-2"><Users className="w-4 h-4 text-brand-400" />{attendanceRecords.length} / {selectedCourse?.totalStudents}</div>
            <div className="px-3 py-1.5 rounded-full bg-brand-500/20 backdrop-blur-md border border-brand-500/30 text-brand-200 text-xs font-bold shadow-lg">{sessionName}</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-80 h-80 relative rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="absolute inset-0 rounded-3xl border-4 border-white/30" />
            <div className="absolute inset-0 rounded-3xl border-4 border-brand-400 [mask-image:linear-gradient(to_bottom,black_20%,transparent_20%,transparent_80%,black_80%),linear-gradient(to_right,black_20%,transparent_20%,transparent_80%,black_80%)] [mask-composite:intersect]" />
            {isScanning && !lastScannedStudent && (
              <motion.div className="absolute left-0 right-0 h-40 bg-gradient-to-b from-brand-400/60 to-transparent" animate={{ top: ['-40%', '100%'] }} transition={{ duration: 2, ease: 'linear', repeat: Infinity }} />
            )}
            <AnimatePresence>
              {lastScannedStudent && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 ${lastScannedStudent.success ? 'bg-green-500/30' : 'bg-red-500/30'}`} />
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="text-center pointer-events-auto space-y-4 pb-8">
          {lastScannedStudent && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl backdrop-blur-md border ${lastScannedStudent.success ? 'bg-green-500/20 border-green-400/30 text-green-300' : 'bg-red-500/20 border-red-400/30 text-red-300'}`}>
              {lastScannedStudent.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span className="font-bold">{lastScannedStudent.name || lastScannedStudent.id}</span>
            </motion.div>
          )}
          <div className="inline-block px-6 py-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10">
            <p className="text-white font-medium">{scanMessage}</p>
          </div>
        </div>
      </div>
      {attendanceRecords.length > 0 && (
        <div className="absolute right-6 top-24 bottom-6 w-80 glass-panel rounded-2xl p-4 overflow-y-auto pointer-events-auto z-30 max-h-[calc(100vh-12rem)]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10"><UserCheck className="w-5 h-5 text-brand-400" /><h3 className="font-bold text-white">Present ({attendanceRecords.length})</h3></div>
          <div className="space-y-2">
            {attendanceRecords.map((record, idx) => (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={`${record.studentId}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div><p className="font-bold text-white text-sm">{record.studentName || record.studentId}</p><p className="text-xs text-slate-400 font-mono">{record.studentId}</p></div>
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-green-400" /></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{new Date(record.timestamp).toLocaleTimeString()}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerScanner;
