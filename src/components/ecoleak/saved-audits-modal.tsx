import { useState, useEffect, type MouseEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUserAudits,
  deleteUserAudit,
  SavedAudit,
} from '@/lib/firestore-service';
import {
  X,
  Clock,
  Trash2,
  FolderOpen,
  AlertTriangle,
  Loader2,
  FileCheck2,
} from 'lucide-react';
import type { EmissionsResult } from '@/lib/emissions';

interface SavedAuditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudit: (audit: SavedAudit) => void;
  onRequireAuth: () => void;
}

export function SavedAuditsModal({
  isOpen,
  onClose,
  onSelectAudit,
  onRequireAuth,
}: SavedAuditsModalProps) {
  const { user } = useAuth();
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!user) return;

    setLoading(true);
    getUserAudits(user.uid)
      .then((data) => setAudits(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  async function handleDelete(e: MouseEvent, auditId: string) {
    e.stopPropagation();
    if (!user) return;
    setDeletingId(auditId);
    try {
      await deleteUserAudit(user.uid, auditId);
      setAudits((prev) => prev.filter((a) => a.id !== auditId));
    } catch (err) {
      console.error('Failed to delete audit:', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      id="saved-audits-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="saved-audits-modal-card"
        className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderOpen className="size-5 text-primary" />
              Saved Factory Audits
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Securely stored in your Firebase Cloud Database.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {!user ? (
            <div className="text-center py-8 space-y-3">
              <AlertTriangle className="size-8 text-amber-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Sign in to view and save audits
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Connect your account to sync factory carbon assessments across devices.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth();
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Loading saved audits from Firebase...</span>
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-10 space-y-2 border border-dashed border-border rounded-lg p-6">
              <FileCheck2 className="size-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-medium text-foreground">No saved audits yet</p>
              <p className="text-xs text-muted-foreground">
                Run an emissions calculation and click "Save Audit to Cloud" to persist it.
              </p>
            </div>
          ) : (
            audits.map((audit) => (
              <div
                key={audit.id}
                onClick={() => {
                  onSelectAudit(audit);
                  onClose();
                }}
                className="group flex items-center justify-between p-3.5 rounded-lg border border-border bg-background/50 hover:bg-muted/40 hover:border-primary/40 cursor-pointer transition-all"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {audit.title}
                    </span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
                      {audit.totalEmissions.toLocaleString()} {audit.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="size-3" />
                      {new Date(audit.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span className="truncate">
                      Top Leak:{' '}
                      <strong className="text-foreground font-medium">
                        {audit.topLeakName}
                      </strong>{' '}
                      ({audit.topLeakPercentage}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    title="Delete saved audit"
                    onClick={(e) => handleDelete(e, audit.id)}
                    disabled={deletingId === audit.id}
                    className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {deletingId === audit.id ? (
                      <Loader2 className="size-4 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
