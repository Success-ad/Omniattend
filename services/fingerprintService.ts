/**
 * fingerprintService.ts
 * Uses window.Fingerprint loaded via /websdk.js script tag in index.html
 * Communicates with DpHostW.exe on port 52181
 */

import { db } from './firebaseClient';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export interface FingerprintTemplate {
  data: string;
  quality: number;
  capturedAt: string;
}

export type ScanStatus = 'idle' | 'connecting' | 'ready' | 'scanning' | 'success' | 'error' | 'no_device';

const getSDK = (): any => {
  const sdk = (window as any).Fingerprint;
  if (!sdk) throw new Error('DigitalPersona WebSdk not loaded. Check /websdk.js script tag in index.html.');
  return sdk;
};

class FingerprintService {
  private reader: any = null;

  async initialize(): Promise<boolean> {
    try {
      const SDK = getSDK();
      if (!SDK.WebApi && !SDK.FingerprintReader) {
        console.error('WebSdk loaded but FingerprintReader not found');
        return false;
      }
      this.reader = SDK.WebApi ? new SDK.WebApi() : new SDK.FingerprintReader();
      console.log('FingerprintService initialized');
      return true;
    } catch (error: any) {
      console.error('Failed to initialize:', error.message);
      return false;
    }
  }

  async captureSingle(): Promise<FingerprintTemplate> {
    return new Promise((resolve, reject) => {
      if (!this.reader) { reject(new Error('Reader not initialized.')); return; }

      const SDK = getSDK();
      const timeout = setTimeout(() => { this.stopReading(); reject(new Error('Scan timeout. Please place your finger on the scanner.')); }, 15000);

      const onSample = (event: any) => {
        clearTimeout(timeout);
        this.stopReading();
        removeListeners();
        try {
          const samples = event.samples ?? event;
          const sample = Array.isArray(samples) ? samples[0] : samples;
          const data = sample?.Data ?? sample?.data ?? '';
          const quality = sample?.Quality ?? sample?.quality ?? 75;
          if (!data) { reject(new Error('Empty fingerprint data. Try again.')); return; }
          resolve({ data, quality, capturedAt: new Date().toISOString() });
        } catch { reject(new Error('Failed to parse fingerprint sample.')); }
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.stopReading();
        removeListeners();
        reject(new Error(error?.Message ?? error?.message ?? 'Scan error occurred.'));
      };

      const removeListeners = () => {
        try {
          if (this.reader?.off) { this.reader.off('SamplesAcquired', onSample); this.reader.off('ErrorOccurred', onError); }
          this.reader.onSamplesAcquired = null;
          this.reader.onErrorOccurred = null;
        } catch { }
      };

      if (this.reader.on) {
        this.reader.on('SamplesAcquired', onSample);
        this.reader.on('ErrorOccurred', onError);
      } else {
        this.reader.onSamplesAcquired = (s: any) => onSample(s);
        this.reader.onErrorOccurred = (e: any) => onError(e);
      }

      const format = SDK.SampleFormat?.PngImage ?? 'PngImage';
      const startPromise = this.reader.startAcquisition ? this.reader.startAcquisition(format) : Promise.resolve();
      startPromise.catch((err: any) => { clearTimeout(timeout); removeListeners(); reject(new Error(err?.message ?? 'Could not start scanner.')); });
    });
  }

  private stopReading(): void {
    try { if (this.reader?.stopAcquisition) this.reader.stopAcquisition(); } catch { }
  }

  async enrollStudent(studentId: string, studentName: string, onProgress?: (scan: number, total: number) => void): Promise<FingerprintTemplate[]> {
    const SCANS_REQUIRED = 3;
    const templates: FingerprintTemplate[] = [];

    for (let i = 0; i < SCANS_REQUIRED; i++) {
      onProgress?.(i + 1, SCANS_REQUIRED);
      const template = await this.captureSingle();
      if (template.quality < 40) throw new Error(`Scan ${i + 1} quality too low (${template.quality}). Try again.`);
      templates.push(template);
      if (i < SCANS_REQUIRED - 1) await new Promise(r => setTimeout(r, 800));
    }

    await addDoc(collection(db, 'fingerprint_templates'), {
      student_id: studentId,
      student_name: studentName,
      templates,
      enrolled_at: new Date().toISOString(),
    });

    console.log(`Enrolled ${studentName} with ${templates.length} templates`);
    return templates;
  }

  async verifyAndMatch(capturedTemplate: FingerprintTemplate, _sessionId: string): Promise<{ matched: boolean; studentId?: string; studentName?: string }> {
    try {
      const snapshot = await getDocs(collection(db, 'fingerprint_templates'));
      for (const doc of snapshot.docs) {
        const enrolled = doc.data();
        const storedTemplates: FingerprintTemplate[] = enrolled.templates ?? [];
        for (const stored of storedTemplates) {
          const similarity = this.compareTemplates(capturedTemplate.data, stored.data);
          if (similarity > 0.85) {
            console.log(`Match: ${enrolled.student_name} (${(similarity * 100).toFixed(1)}%)`);
            return { matched: true, studentId: enrolled.student_id, studentName: enrolled.student_name };
          }
        }
      }
      return { matched: false };
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    }
  }

  async isEnrolled(studentId: string): Promise<boolean> {
    const q = query(collection(db, 'fingerprint_templates'), where('student_id', '==', studentId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  private compareTemplates(t1: string, t2: string): number {
    if (t1 === t2) return 1.0;
    const len = Math.min(200, t1.length, t2.length);
    let matches = 0;
    for (let i = 0; i < len; i++) { if (t1[i] === t2[i]) matches++; }
    return matches / len;
  }

  async dispose(): Promise<void> {
    this.stopReading();
    this.reader = null;
  }
}

export const fingerprintService = new FingerprintService();
