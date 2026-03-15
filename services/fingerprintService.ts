/**
 * fingerprintService.ts
 * Uses hidden iframe + postMessage to communicate with DigitalPersona SDK
 * Avoids all Vite/ESM incompatibility issues with @digitalpersona packages
 */

import { db } from './firebaseClient';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export interface FingerprintTemplate {
  data: string;
  quality: number;
  capturedAt: string;
}

export type ScanStatus =
  | 'idle' | 'connecting' | 'ready' | 'scanning'
  | 'success' | 'error' | 'no_device';

class FingerprintService {
  private iframe: HTMLIFrameElement | null = null;
  private iframeReady = false;
  private messageListeners: ((e: MessageEvent) => void)[] = [];

  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      // Remove any existing iframe
      if (this.iframe) {
        document.body.removeChild(this.iframe);
        this.iframe = null;
        this.iframeReady = false;
      }

      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.src = '/fingerprint.html';
      iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
      document.body.appendChild(iframe);
      this.iframe = iframe;

      const timeout = setTimeout(() => {
        console.warn('[FP] iframe ready timeout — trying anyway');
        this.iframeReady = true;
        resolve(true);
      }, 8000);

      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'ready' || e.data?.type === 'connected') {
          clearTimeout(timeout);
          this.iframeReady = true;
          console.log('[FP] iframe SDK ready:', e.data);
          window.removeEventListener('message', onMessage);
          resolve(true);
        }
        if (e.data?.type === 'error' && !this.iframeReady) {
          clearTimeout(timeout);
          console.error('[FP] iframe SDK error:', e.data.message);
          window.removeEventListener('message', onMessage);
          resolve(false);
        }
      };

      window.addEventListener('message', onMessage);
    });
  }

  private sendToIframe(action: string) {
    this.iframe?.contentWindow?.postMessage({ action }, '*');
  }

  async captureSingle(): Promise<FingerprintTemplate> {
    return new Promise((resolve, reject) => {
      if (!this.iframeReady || !this.iframe) {
        reject(new Error('Scanner not initialized.'));
        return;
      }

      let lastQuality = 75;

      const timeout = setTimeout(() => {
        this.stopReading();
        cleanup();
        reject(new Error('Scan timeout — place finger on scanner.'));
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
      };

      const onMessage = (e: MessageEvent) => {
        const msg = e.data;
        if (!msg?.type) return;

        if (msg.type === 'quality') {
          lastQuality = msg.value ?? lastQuality;
          console.log('[FP] Quality:', lastQuality);
        } else if (msg.type === 'sample') {
          cleanup();
          this.stopReading();
          if (!msg.data) {
            reject(new Error('Empty sample received.'));
            return;
          }
          resolve({
            data: msg.data,
            quality: lastQuality,
            capturedAt: new Date().toISOString(),
          });
        } else if (msg.type === 'error') {
          cleanup();
          this.stopReading();
          reject(new Error(msg.message ?? 'Scanner error'));
        }
      };

      window.addEventListener('message', onMessage);
      this.sendToIframe('startScan');
      console.log('[FP] startScan sent to iframe');
    });
  }

  private stopReading() {
    this.sendToIframe('stopScan');
  }

  async enrollStudent(
    studentId: string,
    studentName: string,
    onProgress?: (scan: number, total: number) => void
  ): Promise<FingerprintTemplate[]> {
    const SCANS_REQUIRED = 3;
    const templates: FingerprintTemplate[] = [];

    for (let i = 0; i < SCANS_REQUIRED; i++) {
      onProgress?.(i + 1, SCANS_REQUIRED);
      const template = await this.captureSingle();
      if (template.quality < 40 && template.quality !== 0) {
      throw new Error(`Scan ${i + 1} quality too low (${template.quality}). Try again.`);
    }
      templates.push(template);
      if (i < SCANS_REQUIRED - 1) await new Promise(r => setTimeout(r, 1000));
    }

    await addDoc(collection(db, 'fingerprint_templates'), {
      student_id: studentId,
      student_name: studentName,
      templates,
      enrolled_at: new Date().toISOString(),
    });

    console.log(`[FP] Enrolled ${studentName} with ${templates.length} templates`);
    return templates;
  }

  async verifyAndMatch(
    capturedTemplate: FingerprintTemplate,
    _sessionId: string
  ): Promise<{ matched: boolean; studentId?: string; studentName?: string }> {
    try {
      const snapshot = await getDocs(collection(db, 'fingerprint_templates'));
      for (const doc of snapshot.docs) {
        const enrolled = doc.data();
        const stored: FingerprintTemplate[] = enrolled.templates ?? [];
        for (const t of stored) {
          const similarity = this.compareTemplates(capturedTemplate.data, t.data);
          if (similarity > 0.85) {
            return {
              matched: true,
              studentId: enrolled.student_id,
              studentName: enrolled.student_name,
            };
          }
        }
      }
      return { matched: false };
    } catch (err) {
      console.error('[FP] verifyAndMatch error:', err);
      throw err;
    }
  }

  async isEnrolled(studentId: string): Promise<boolean> {
    const q = query(
      collection(db, 'fingerprint_templates'),
      where('student_id', '==', studentId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }

  private compareTemplates(t1: string, t2: string): number {
    if (t1 === t2) return 1.0;
    const len = Math.min(200, t1.length, t2.length);
    let matches = 0;
    for (let i = 0; i < len; i++) {
      if (t1[i] === t2[i]) matches++;
    }
    return matches / len;
  }

  async dispose(): Promise<void> {
    this.stopReading();
    if (this.iframe) {
      document.body.removeChild(this.iframe);
      this.iframe = null;
    }
    this.iframeReady = false;
  }
}

export const fingerprintService = new FingerprintService();