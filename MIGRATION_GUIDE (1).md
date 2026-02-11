# QR Attendance System - Inverted Flow Migration Guide

## Overview

Your attendance system has been **inverted** to change the flow from:
- ❌ **OLD:** Lecturer generates QR → Student scans
- ✅ **NEW:** Student generates QR → Lecturer scans

---

## What Changed?

### 1. **Student Side (New: StudentQRGenerator.tsx)**
Students now:
- Log in with matric number and password
- Select their course
- **Generate a QR code** containing their details
- Show the QR code to the lecturer's scanner

**QR Payload Structure:**
```typescript
{
  studentId: string;        // Matric number (e.g., "190405001")
  studentName?: string;     // Optional full name
  courseId: string;         // Course ID (e.g., "CS-404")
  courseName: string;       // Course name
  timestamp: number;        // When QR was generated
  nonce: string;           // Unique identifier to prevent duplicates
}
```

**Key Features:**
- QR auto-refreshes every 30 seconds
- Beautiful ticket-style UI
- Manual refresh button available
- Works offline (QR generation is client-side)

---

### 2. **Lecturer Side (New: LecturerScanner.tsx)**
Lecturers now:
- Log in with lecturer ID and password
- Select their course
- Create an attendance session
- **Choose attendance mode:**
  - **QR Code Camera**: Use camera to scan student QR codes
  - **Biometric System**: Use physical hardware scanner for student IDs
- View live attendance list

**Key Features:**
- **Dual Mode Support**: Camera scanner OR biometric/hardware scanner
- Real-time camera scanning for QR codes
- Text input mode for physical barcode/biometric scanners
- Duplicate prevention (same student can't be marked twice)
- Wrong course detection (QR mode only)
- Already-marked detection
- Live attendance sidebar showing who's present
- Success/error visual feedback

---

## File Structure

```
/components/
├── StudentQRGenerator.tsx   ← NEW: Students generate QR codes
├── LecturerScanner.tsx      ← NEW: Lecturers scan QR codes
├── DynamicQR.tsx            ← OLD: Can be removed or kept for legacy
└── LiveScanner.tsx          ← OLD: Can be removed or kept for legacy
```

---

## Database Schema

Make sure your `attendance_logs` table supports these fields:

```sql
CREATE TABLE attendance_logs (
  id SERIAL PRIMARY KEY,
  class_id TEXT NOT NULL,           -- Session ID
  student_id TEXT NOT NULL,         -- Matric number
  student_name TEXT,                -- Optional student name
  nonce TEXT NOT NULL UNIQUE,       -- Prevents duplicate scans
  timestamp TIMESTAMPTZ NOT NULL,
  UNIQUE(class_id, student_id)      -- One record per student per session
);
```

---

## Implementation Steps

### Step 1: Install Dependencies
Make sure you have these packages:
```bash
npm install qrcode jsqr framer-motion lucide-react
```

### Step 2: Update App.tsx
Replace your current App.tsx with the new one provided. The key changes:
- `View.LECTURER` now renders `LecturerScanner`
- `View.STUDENT` now renders `StudentQRGenerator`
- Updated button labels and icons

### Step 3: Add New Components
Place these files in your `/components` directory:
- `StudentQRGenerator.tsx`
- `LecturerScanner.tsx`

### Step 4: Update Supabase Client
Ensure your `supabaseClient.ts` is configured correctly:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Step 5: Camera Permissions
The lecturer scanner needs camera access. Make sure:
- Your app is served over HTTPS (required for camera access)
- Users grant camera permission when prompted
- For development, `localhost` works fine

---

## Testing the Flow

### As a Student:
1. Click "Student" on landing page
2. Enter matric number (e.g., `190405001`)
3. Enter name (optional)
4. Enter password
5. Select course (e.g., "Network Security")
6. QR code appears automatically
7. Show QR to lecturer's camera

### As a Lecturer:
1. Click "Lecturer" on landing page
2. Enter lecturer ID (e.g., `LEC-001`)
3. Enter password
4. Select course
5. Click "Start Scanner"
6. Create session (name, date, description)
7. **Choose attendance mode:**
   
   **Option A - QR Code Camera:**
   - Click "QR Code Camera"
   - Allow camera access
   - Point camera at student QR codes
   - Watch attendance list populate in real-time
   
   **Option B - Biometric System:**
   - Click "Biometric System"
   - Attach your physical barcode/fingerprint scanner
   - Scanner will input student IDs automatically
   - Or manually type student IDs and press Enter
   - Watch attendance list populate

---

## Security Features

### Anti-Fraud Measures:
1. **Nonce System**: Each QR has a unique identifier
   - Same QR can't be scanned twice
   - Prevents screenshots/sharing

2. **Course Validation**: 
   - Scanner checks if QR matches the course
   - Rejects QR codes from wrong courses

3. **Duplicate Prevention**:
   - Database constraint prevents same student being marked twice
   - UI shows "Already marked present" message

4. **Timestamp Validation**:
   - QRs include generation timestamp
   - Can be used for expiry logic (optional)

5. **Scan Cooldown**:
   - 2-second cooldown between scans
   - Prevents accidental double-scans

---

## Hardware Scanner Setup (Biometric Mode)

The biometric mode supports physical barcode scanners, RFID readers, or fingerprint scanners that output text (like a keyboard).

### Compatible Devices:
- USB Barcode Scanners (configured as keyboard input)
- RFID Card Readers (keyboard emulation mode)
- Fingerprint Scanners (with keyboard output)
- Any device that types student IDs automatically

### Setup Instructions:
1. Connect your scanner via USB
2. Configure scanner to output student ID followed by Enter/Return
3. Test scanner in a text editor to verify it works
4. In the app, select "Biometric System" mode
5. The input field will auto-focus
6. When scanner reads, it automatically submits

### Manual Entry:
If no scanner is connected, you can manually type student IDs and press Enter. This is useful for:
- Testing the system
- Backup when scanner fails
- Small class sizes

---

## Customization Options

### Adjust QR Refresh Rate
In `StudentQRGenerator.tsx`, line 75:
```typescript
const interval = setInterval(generateQR, 30000); // Change 30000 to desired ms
```

### Change Scan Cooldown
In `LecturerScanner.tsx`, line 251:
```typescript
if (now - lastScanTimeRef.current < 2000) { // Change 2000 to desired ms
```

### Add QR Expiry
In `LecturerScanner.tsx`, after parsing the payload:
```typescript
const qrAge = Date.now() - payload.timestamp;
const MAX_AGE = 5 * 60 * 1000; // 5 minutes

if (qrAge > MAX_AGE) {
  setScanMessage("QR code expired");
  return;
}
```

---

## Troubleshooting

### Camera Not Working
- Check HTTPS is enabled
- Verify camera permissions in browser
- Try `facingMode: "user"` instead of `"environment"` for front camera

### QR Not Scanning
- Ensure good lighting
- Hold QR steady in center of frame
- Try adjusting camera resolution in code

### Duplicate Entries
- Check database unique constraint is set
- Verify `nonce` field is being stored correctly

### QR Not Generating
- Check browser console for errors
- Verify `qrcode` package is installed
- Ensure student details are filled

### Biometric Scanner Not Working
- Verify scanner is configured for keyboard emulation
- Test scanner in a text editor first
- Check if scanner outputs Enter/Return after student ID
- Ensure input field has focus (click on it)
- Try manual entry to test the system

---

## Migration from Old System

If you want to keep both systems:
1. Keep old files (DynamicQR.tsx, LiveScanner.tsx)
2. Add a mode selector in App.tsx
3. Let users choose "Classic Mode" or "New Mode"

To fully migrate:
1. Replace imports in App.tsx
2. Remove old component files
3. Update database if needed
4. Test thoroughly before deploying

---

## Benefits of Inverted Flow

✅ **Better Scalability**: Hundreds of students can show QR codes simultaneously
✅ **Offline-First**: Students can generate QR without internet
✅ **Less Network Load**: Only lecturer needs to submit data
✅ **Dual Mode Support**: QR camera OR hardware scanner flexibility
✅ **Hardware Scanner Support**: Can use barcode/RFID/fingerprint scanners
✅ **Better Privacy**: Student controls when to show QR
✅ **Faster Processing**: No bottleneck from single QR refresh rate
✅ **Accessibility**: Biometric mode works without student devices

---

## Next Steps

1. Test the new flow in development
2. Update your database schema if needed
3. Inform lecturers and students of the new process
4. Monitor for any issues in production
5. Consider adding features like:
   - Export attendance to CSV
   - Email reports to lecturers
   - Student attendance history
   - Analytics dashboard

