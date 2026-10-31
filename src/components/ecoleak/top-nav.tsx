import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from './auth-modal';
import { Leaf, LogIn, LogOut, Home, Sparkles } from 'lucide-react';

function Logo({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <button
      type="button"
      onClick={onGoHome}
      className="flex items-center gap-2.5 text-left group transition-transform hover:scale-[1.01]"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xs group-hover:shadow-md transition-shadow relative"
      >
        <Leaf className="size-5" />
        {/* Subtle yellow leaf badge */}
        <span className="absolute -top-1 -right-1 text-xs">🌿</span>
      </span>
      <div className="flex flex-col">
        <span className="font-mono text-lg font-black tracking-tight text-foreground leading-none">
          <span className="text-emerald-700 dark:text-emerald-400">Eco</span>
          <span className="text-yellow-600 dark:text-yellow-400 font-extrabold">Leak</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground leading-tight mt-0.5">
          Factory Carbon Audit
        </span>
      </div>
    </button>
  );
}

interface TopNavProps {
  onGoHome?: () => void;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

export function TopNav({ onGoHome, onOpenAuth }: TopNavProps) {
  const { user, signOut, loading } = useAuth();
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  function handleOpen(mode: 'signin' | 'signup') {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setAuthMode(mode);
      setInternalAuthOpen(true);
    }
  }

  return (
    <>
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo onGoHome={onGoHome} />

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted/60" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-2 pr-3 text-xs text-foreground">
                  <div className="grid size-6 place-items-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    {user.displayName
                      ? user.displayName.charAt(0).toUpperCase()
                      : user.email
                      ? user.email.charAt(0).toUpperCase()
                      : 'U'}
                  </div>
                  <span className="max-w-[130px] sm:max-w-[180px] truncate font-mono text-[11px] font-medium">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  id="nav-sign-out-btn"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={internalAuthOpen}
        defaultMode={authMode}
        onClose={() => setInternalAuthOpen(false)}
      />
    </>
  );
}
