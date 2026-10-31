import { useState, useEffect, type MouseEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUserAudits,
  deleteUserAudit,
  SavedAudit,
} from '@/lib/firestore-service';
import {
  X,
  History,
  Trash2,
  AlertTriangle,
  Loader2,
  FileCheck2,
  ArrowRight,
  TrendingDown,
  Calendar,
} from 'lucide-react';

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
    const targetUserId = user ? user.uid : 'guest';

    setLoading(true);
    getUserAudits(targetUserId)
      .then((data) => setAudits(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  async function handleDelete(e: MouseEvent, auditId: string) {
    e.stopPropagation();
    const targetUserId = user ? user.uid : 'guest';
    setDeletingId(auditId);
    try {
      await deleteUserAudit(targetUserId, auditId);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="saved-audits-modal-card"
        className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="size-5 text-emerald-600 dark:text-emerald-400" />
              Audit History &amp; Saved Drafts
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review your previous factory calculations, compare hotspots, and restore any past draft.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-emerald-600" />
              <span className="text-xs">Loading audit history...</span>
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-10 space-y-2 border border-dashed border-border rounded-xl p-6">
              <FileCheck2 className="size-10 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No audit history recorded yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Calculate emissions from raw operational records and your drafts will automatically save in this history list.
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
                className="group flex items-center justify-between p-4 rounded-xl border border-border bg-background/50 hover:bg-emerald-500/5 hover:border-emerald-600/40 cursor-pointer transition-all shadow-xs"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                      {audit.title}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {Number(audit.totalEmissions).toLocaleString(undefined, { maximumFractionDigits: 1 })} {audit.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="size-3" />
                      {new Date(audit.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>·</span>
                    <span>Top leak: <strong className="text-foreground">{audit.topLeakName}</strong> ({audit.topLeakPercentage}%)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Restore <ArrowRight className="size-3" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, audit.id)}
                    disabled={deletingId === audit.id}
                    className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete saved audit"
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

        {/* Footer info banner */}
        {!user && (
          <div className="mt-2 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Currently saved locally in this browser.</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequireAuth();
              }}
              className="font-semibold text-emerald-600 hover:underline"
            >
              Sign up to cloud sync
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
