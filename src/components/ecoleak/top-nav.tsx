import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from './auth-modal';
import { Leaf, LogIn, LogOut, User as UserIcon } from 'lucide-react';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-xs"
      >
        <Leaf className="size-4" />
      </span>
      <div className="flex flex-col">
        <span className="font-mono text-base font-bold tracking-tight text-foreground leading-none">
          Eco<span className="text-primary">Leak</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground leading-tight">
          Factory Carbon Leak Audit
        </span>
      </div>
    </div>
  );
}

export function TopNav() {
  const { user, signOut, firebaseReady, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted/60" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-2 pr-3 text-xs text-foreground">
                  <div className="grid size-6 place-items-center rounded-full bg-primary/20 text-primary font-bold text-[11px]">
                    {user.displayName
                      ? user.displayName.charAt(0).toUpperCase()
                      : user.email
                      ? user.email.charAt(0).toUpperCase()
                      : 'U'}
                  </div>
                  <span className="max-w-[130px] sm:max-w-[200px] truncate font-mono text-[11px] font-medium">
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
            ) : (
              <button
                type="button"
                id="nav-sign-in-btn"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <LogIn className="size-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
