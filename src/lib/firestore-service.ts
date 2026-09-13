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

export async function saveAuditToFirestore(
  userId: string,
  title: string,
  result: EmissionsResult,
): Promise<string> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firestore is not configured.');
  }

  const auditId = `audit_${Date.now()}`;
  const docRef = doc(db, 'users', userId, 'audits', auditId);

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

  await setDoc(docRef, payload);
  return auditId;
}

export async function getUserAudits(userId: string): Promise<SavedAudit[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const auditsRef = collection(db, 'users', userId, 'audits');
    const q = query(auditsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => docSnap.data() as SavedAudit);
  } catch (err) {
    console.warn('Failed to load user audits:', err);
    return [];
  }
}

export async function deleteUserAudit(userId: string, auditId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  const docRef = doc(db, 'users', userId, 'audits', auditId);
  await deleteDoc(docRef);
}
