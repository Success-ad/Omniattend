# Omniattend
an attendance system for students and lecturers

# Omniattend - Complete Flow Explanation

## 🎓 How The System Works - Step by Step

---

## 📱 STUDENT FLOW

### Step 1: Registration (One-Time)
**What Happens:**
1. Student clicks "Register as a student" (at bottom of landing page)
2. Fills in personal info:
   - First & Last Name
   - Matric Number (e.g., 20/2726)
   - Email
   - Phone (optional)
   - Department
   - Level (100-500)
   - Password
3. Selects courses they're enrolled in (CS-404, CS-302, etc.)
4. Clicks "Complete Registration"

### Step 2: Daily Login & QR Generation
**What Happens:**
1. Student clicks "Student" on landing page
2. Enters matric number: `20/2726`
3. Enters password
4. Student is authenticated via Firebase
5. Selects the course they're attending TODAY (e.g., "Network Security")
6. A QR code is generated containing the students details

**Important:** 
- QR code refreshes every 60 seconds (new nonce each time)
- Student shows this QR to lecturer's scanner
- QR contains NO sensitive data (no password, no email)

## 👨‍🏫 LECTURER FLOW

### Option A: Manual Lecturer Account (Recommended for Testing)

**You DON'T need a registration system for lecturers.** Just add them manually in Firebase:

#### How to Add Lecturers Manually:

**Method 1: Firebase Console (GUI)**
1. Go to Firebase Console → Authentication
2. Click "Add user"
3. Email: `lecturer@university.edu`
4. Password: `LecturerPass123`
5. Create user
6. Go to Firestore Database
7. Create collection: `lecturers`
8. Add document:
```javascript
{
  uid: "copy_firebase_uid_here",
  firstName: "Dr. Sarah",
  lastName: "Johnson",
  email: "lecturer@university.edu",
  department: "Computer Science",
  courses: ["CS-404", "CS-302"],
  createdAt: "2025-02-15T...",
  isActive: true
}
```

**Method 2: Firebase Admin SDK (Programmatic)**
```javascript
// Script to add lecturers (run once)
import { db } from './firebaseClient';
import { collection, addDoc } from 'firebase/firestore';

await addDoc(collection(db, 'lecturers'), {
  firstName: "Dr. Sarah",
  lastName: "Johnson",
  lecturerId: "LEC-001",
  email: "lecturer@university.edu",
  department: "Computer Science",
  courses: ["CS-404", "CS-302"],
  createdAt: new Date().toISOString(),
  isActive: true
});
```

---

### Option B: Create Lecturer Registration (Similar to Students)

If you want lecturers to self-register, create a `LecturerRegistration.tsx` component (similar to StudentRegistration).

## 🎯 ATTENDANCE PROCESS

### Phase 1: Lecturer Creates Session

**What Happens:**
1. Lecturer clicks "Lecturer" on landing page
2. Logs in with:
   - Email: 'lecturer@babcock.com'
   - Password: (their password) //123456
3. Selects course: e.g "Network Security (CS-404)"
4. Clicks "Start Scanner"
5. Fills in session details:
   - Session Name: "Lecture: Network Security"
   - Date: 2025-02-15
   - Description: "Chapter 5: Cryptography"
6. Clicks "Start Scanning Session"

### Phase 2: Lecturer Chooses Scanning Mode

**Two Options:**

#### Option A: QR Code Camera 📷
- Uses device camera
- Scans student-generated QR codes
- Good for classes where students have phones

#### Option B: Biometric System 👆
- Uses physical barcode/fingerprint scanner
- Students scan their ID cards or fingerprints
- Good for hardware-based attendance

---

### Phase 3: Scanning Students (QR Mode)

**What Happens When Lecturer Scans Student QR:**

1. **Student shows QR on phone**
   ```
   Student: "Here's my QR code"
   [QR Code displayed on phone]
   ```

2. **Lecturer points camera at QR**
   ```
   Camera reads QR → Extracts data:
   {
     studentId: "20/2726",
     studentName: "John Doe",
     courseId: "CS-404",
     timestamp: 1708012345678,
     nonce: "abc123..."
   }

3. **App Validates QR Code:**

4. **App Saves Attendance:**
   ```javascript
   // Firebase Collection: attendance_logs/{logId}
   {
     class_id: "CS-404-lx8k9m", // Session ID
     student_id: "20/2726",
     matric_number: "20/2726",
     student_name: "John Doe",
     nonce: "abc123...",
     timestamp: "",
     marked_at: Firebase.Timestamp.now()
   }
5. **Visual Feedback:**
   ```
   Screen shows:
   ✅ Green flash
   ✅ "John Doe marked present"
   ✅ Counter updates: 1/42 students
   ✅ Student appears in sidebar list
   ```

6. **Student sees confirmation on their end** (optional feature)
   - Could add notification: "✅ Attendance marked!"

---

### Scanning Multiple Students

**The Process Repeats:**

Student 1: Scan → ✅ "20/2726 - John Doe" → Counter: 1/42
Student 2: Scan → ✅ "20/2727 - Jane Smith" → Counter: 2/42
Student 3: Scan → ✅ "20/2728 - Mike Brown" → Counter: 3/42

## Phase 4: Scanning via Biomtrics (fingerprint)
1. Lecturer navigates to Enroll Students from the dashboard.
2. Enters student matric number and full name.
3. System checks `fingerprint_templates` for existing enrollment.
4. If not enrolled, confirms student details screen shown.
5. Each student is required to place their finger on the scanner 3 times
6. Each scan triggers `startAcquisition(SampleFormat.PngImage)` via postMessage
   - Sample received as base64url PNG string via `SamplesAcquired` event
   - Quality check: scans with score`quality < 40` (and quality ≠ 0) are rejected
7. All 3 templates stored in Firestore.
8. UI progresses through "Scan 1 of 3" → "Scan 2 of 3" → "Scan 3 of 3" → Done.

### How it Works
1. Receives two base64url-encoded PNG strings via POST.
2. Converts base64url → standard base64 → Buffer.
3. Loads both images with Jimp.
4. Resizes both to 128×128 pixels.
5. Converts to greyscale.
6. Computes average pixel brightness for each image.
7. Builds a binary hash: each pixel is `1` if above average, `0` if below.
8. Counts matching bits between the two hashes.
9. Returns `matchingBits / totalBits` as a score between 0 and 1.

## Fingerprint Integration

### Hardware Requirements

| Requirement | Detail |
|-------------|--------|
| Scanner model | DigitalPersona U.are.U 4500 |
| Driver software | HID Authentication Device Client v5.2.0.50 |
| Windows service | DpHostW.exe must be running |
| Connection | USB |
| OS | Windows only |

## 📊 VIEWING SESSION HISTORY

### How History Works:

**What Happens:**
1. Lecturer logs in
2. Selects course: "Network Security (CS-404)"
3. Clicks "Session History"

**What Gets Displayed:**

// Firebase Query:
SELECT * FROM sessions 
WHERE course_id = 'CS-404' 
ORDER BY created_at DESC

// Results shown:
[
  {
    name: "Lecture: Network Security",
    description: "Chapter 5: Cryptography",
    date: "2025-02-15",
    created_at: "2025-02-15T14:00:00Z"
  },
  {
    name: "Lecture: Network Security",
    description: "Chapter 4: Network Protocols",
    date: "2025-02-12",
    created_at: "2025-02-12T14:00:00Z"
  },
   **You can click on each session to view the students present at that attendance session taken**
]
