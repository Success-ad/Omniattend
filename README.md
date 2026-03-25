# OmniAttend - University Attendance System

**Version 2.0**
A complete semester-based attendance management system with **QR code + biometric fingerprint** verification.

---

## 🎯 System Overview

OmniAttend is a modern university attendance system that supports **three user roles**:

- **Students** – Self-register, browse & enroll in courses, generate QR codes, view attendance history
- **Lecturers** – Self-register, create & manage courses, start attendance sessions, mark attendance (QR or fingerprint), enroll student fingerprints
- **Administrators** – Manage semesters, end/archive semesters, view system statistics

**Core Features**
- Semester-based course management (only **one active semester** at a time)
- Student self-enrollment (no course selection during signup)
- Dual attendance verification: QR code **or** fingerprint
- Department-filtered course browsing
- Real-time attendance logging
- Automatic historical archiving when a semester ends

---

## 📱 STUDENT FLOW

### Step 1: Registration (One-Time)
1. On the landing page, click **"Register as Student"**
2. Fill in:
   - Matric Number (e.g. `20/2726`)
   - First & Last Name
   - Email
   - Password
   - Department
   - Level (100–500)
3. **No courses are selected here** — enrollment happens later.

### Step 2: Login & Course Enrollment
1. Click **"Student"** → Login with matric number + password
2. You will see the **current active semester**
3. Browse available courses:
   - Default filter = your department
   - You can switch to any other department
4. Click **"Enroll"** on any course you want
5. Courses now appear in **"My Enrolled Courses"**

### Step 3: Generate QR Code for Attendance
1. Go to **"My Enrolled Courses"**
2. Select the course you are attending today
3. Click **"Generate QR Code"**
4. Show the QR to your lecturer (refreshes automatically every 60 seconds for security)

---

## 👨‍🏫 LECTURER FLOW

### Step 1: Self-Registration (No manual Firebase setup needed)
1. On the landing page, click **"Register as Lecturer"**
2. Fill in:
   - First & Last Name
   - Email
   - Password
   - Department
   - Phone Number
3. Account is **immediately activated**

### Step 2: Create a Course (in active semester only)
1. Login as Lecturer
2. Go to **"My Courses"**
3. Click **"Create New Course"**
4. Fill in:
   - Course Code (e.g. `CS-404`)
   - Course Name
   - Description
   - Department (pre-filled from your profile)
5. Course is now visible to students in the current semester

### Step 3: Start an Attendance Session
1. From **"My Courses"**, select a course
2. Click **"Start Attendance Session"**
3. Enter:
   - Session Name (e.g. "Lecture 5: Memory Management")
   - Date (auto-filled)
4. Choose scanning mode:
   - **QR Code Camera** 📷 (students show their phone)
   - **Fingerprint Scanner** 👆 (hardware required)

### Step 4: Mark Attendance

#### Option A: QR Code Mode
- Point camera at student’s generated QR code
- System automatically:
  - Validates enrollment
  - Prevents duplicates
  - Logs attendance with `method: "qr"`

#### Option B: Fingerprint Mode
- System switches to biometric mode
- Students place finger on the **DigitalPersona U.are.U 4500** scanner
- System compares against enrolled templates (threshold 80% similarity)
- Logs attendance with `method: "fingerprint"`

---

##  ADMINISTRATOR FLOW

1. Login as Admin (created manually in Firebase)
2. **Create New Semester**
   - Semester ID: e.g. `2025/26.1`
   - Name, start & end dates
3. **End Semester** (one-click process):
   - Automatically archives all enrollments
   - Calculates attendance percentages
   - Moves data to student `attendance_history`
   - Clears current enrollments for next semester

---

## 🔬 Fingerprint Enrollment (Lecturer → Student)

1. Lecturer goes to **"Enroll Students"** in course dashboard
2. Enters student **matric number**
3. If not enrolled:
   - Student places finger **3 times** on scanner
   - Each scan captured as base64 PNG (~165 KB)
   - Quality validated automatically
4. Templates stored in `fingerprint_templates` collection
5. Student is now ready for biometric attendance

---

## 📊 Key Concepts You Should Know

| Concept              | Description |
|----------------------|-----------|
| **Active Semester**  | Only **one** semester can be active at a time |
| **Course Enrollment**| Students enroll themselves after registration |
| **Sessions**         | Created by lecturers per lecture/date |
| **Attendance Logs**  | Stored with method (`qr` or `fingerprint`) |
| **History**          | Automatically archived when semester ends |

---

## 🛠 Technology Stack (Quick Reference)

- **Frontend**: React 18 + TypeScript + Vite + Tailwind
- **Backend**: Firebase Firestore + Firebase Auth
- **Biometrics**: DigitalPersona U.are.U 4500 + DpHostW.exe (Windows only)
- **Local Server**: Node.js fingerprint compare service (port 3002)

---

##  Quick Start for Developers / Testers

1. Make sure:
   - Firebase project is configured
   - `DpHostW.exe` and scanner drivers are running (for fingerprint)
   - Local compare server is running on port 3002
2. `npm install && npm run dev`


**OmniAttend v2.0** — Semester-based, dual-authentication attendance system built for universities.
