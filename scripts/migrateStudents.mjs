import fs from 'fs';
import path from 'path';
import process from 'process';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, updateDoc, doc } from 'firebase/firestore';

const cwd = process.cwd();

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
      accumulator[key] = value;
      return accumulator;
    }, {});
};

const env = {
  ...parseEnvFile(path.join(cwd, '.env')),
  ...parseEnvFile(path.join(cwd, '.env.local')),
  ...process.env,
};

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

for (const key of requiredKeys) {
  if (!env[key]) {
    throw new Error(`Missing ${key}. Add it to your environment or .env.local before running the migration.`);
  }
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snapshot = await getDocs(collection(db, 'students'));

let updatedCount = 0;

for (const studentDoc of snapshot.docs) {
  const data = studentDoc.data();
  const updates = {};

  if (!Array.isArray(data.current_enrollments)) {
    updates.current_enrollments = [];
  }

  if (!Array.isArray(data.attendance_history)) {
    updates.attendance_history = [];
  }

  if (!Array.isArray(data.enrolledCourses)) {
    updates.enrolledCourses = [];
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'students', studentDoc.id), updates);
    updatedCount += 1;
    console.log(`Updated student ${studentDoc.id}`);
  }
}

console.log(`Migration complete. ${updatedCount} student documents updated.`);
