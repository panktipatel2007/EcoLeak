import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { EmissionsResult } from './emissions';

export interface SavedAudit {
  id: string;
  userId: string;
  title: string;
  totalEmissions: number;
  unit: string;
  topLeakName: string;
  topLeakPercentage: number;
  topLeakSeverity: string;
  recordCount: number;
  createdAt: string;
  resultData: EmissionsResult;
}

const GUEST_DRAFT_KEY = 'ecoleak_guest_draft_audit';
const LOCAL_STORAGE_HISTORY_KEY = 'ecoleak_local_audits';

// Helper for local storage history fallback
function getLocalAudits(userId: string): SavedAudit[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_HISTORY_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAudit(userId: string, audit: SavedAudit) {
  try {
    const existing = getLocalAudits(userId);
    const updated = [audit, ...existing.filter((a) => a.id !== audit.id)];
    localStorage.setItem(`${LOCAL_STORAGE_HISTORY_KEY}_${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }
}

export async function saveAuditToFirestore(
  userId: string,
  title: string,
  result: EmissionsResult,
): Promise<string> {
  const auditId = `audit_${Date.now()}`;
  const payload: SavedAudit = {
    id: auditId,
    userId,
    title: title || 'Factory Emissions Audit',
    totalEmissions: result.total_emissions,
    unit: result.unit,
    topLeakName: result.top_leak?.name || 'None',
    topLeakPercentage: result.top_leak?.percentage || 0,
    topLeakSeverity: result.top_leak?.severity || 'LOW',
    recordCount: result.validRecordsCount || 0,
    createdAt: new Date().toISOString(),
    resultData: result,
  };

  // Always keep a local copy in history so user never loses their draft
  saveLocalAudit(userId, payload);

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'users', userId, 'audits', auditId);
      await setDoc(docRef, payload);
    } catch (err) {
      console.warn('Firestore remote save failed, kept local history:', err);
    }
  }

  return auditId;
}

export async function getUserAudits(userId: string): Promise<SavedAudit[]> {
  const localList = getLocalAudits(userId);

  if (!isFirebaseConfigured() || !db) {
    return localList;
  }

  try {
    const auditsRef = collection(db, 'users', userId, 'audits');
    const q = query(auditsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreList = snapshot.docs.map((docSnap) => docSnap.data() as SavedAudit);

    // Merge by id, keeping latest
    const map = new Map<string, SavedAudit>();
    localList.forEach((a) => map.set(a.id, a));
    firestoreList.forEach((a) => map.set(a.id, a));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (err) {
    console.warn('Failed to load user audits from Firestore, using local history:', err);
    return localList;
  }
}

export async function deleteUserAudit(userId: string, auditId: string): Promise<void> {
  try {
    const existing = getLocalAudits(userId);
    localStorage.setItem(
      `${LOCAL_STORAGE_HISTORY_KEY}_${userId}`,
      JSON.stringify(existing.filter((a) => a.id !== auditId)),
    );
  } catch (err) {
    console.warn('Error deleting from localStorage:', err);
  }

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'users', userId, 'audits', auditId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Error deleting from Firestore:', err);
    }
  }
}

// Guest Draft persistence
export function saveGuestDraft(result: EmissionsResult, title?: string) {
  try {
    const draft: SavedAudit = {
      id: `draft_${Date.now()}`,
      userId: 'guest',
      title: title || 'Guest Factory Audit Draft',
      totalEmissions: result.total_emissions,
      unit: result.unit,
      topLeakName: result.top_leak?.name || 'None',
      topLeakPercentage: result.top_leak?.percentage || 0,
      topLeakSeverity: result.top_leak?.severity || 'LOW',
      recordCount: result.validRecordsCount || 0,
      createdAt: new Date().toISOString(),
      resultData: result,
    };
    localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('Could not save guest draft:', err);
  }
}

export function getGuestDraft(): SavedAudit | null {
  try {
    const raw = localStorage.getItem(GUEST_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearGuestDraft() {
  try {
    localStorage.removeItem(GUEST_DRAFT_KEY);
  } catch (err) {
    console.warn('Error clearing guest draft:', err);
  }
}
