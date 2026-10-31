import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  ArrowRight,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync mode when defaultMode changes upon opening
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
      setSuccess(null);
      setIsOperationNotAllowed(false);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    setIsOperationNotAllowed(false);
    try {
      await signInWithGoogle();
      setSuccess('Signed in successfully with Google!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed.';
      if (msg.includes('auth/popup-closed-by-user')) {
        setError('Sign-in popup was closed before completing.');
      } else if (msg.includes('auth/popup-blocked')) {
        setError('Popup was blocked by your browser. Please allow popups or open in a new tab.');
      } else if (msg.includes('auth/unauthorized-domain')) {
        setError(
          `Domain "${window.location.hostname}" is not authorized in Firebase Auth. Open the app via http://localhost:3000, or add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`
        );
      } else if (msg.includes('auth/operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        setError('Google sign-in provider is disabled in Firebase Console.');
      } else {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsOperationNotAllowed(false);
    setSuccess(null);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        setSuccess('Signed in successfully!');
      } else {
        if (password.length < 6) {
          throw new Error('Password should be at least 6 characters long.');
        }
        await signUp(email, password);
        setSuccess('Account created successfully!');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed.';
      if (msg.includes('auth/unauthorized-domain')) {
        setError(
          `Domain "${window.location.hostname}" is not authorized in Firebase Auth. Please access via http://localhost:3000, or add "${window.location.hostname}" to Authorized Domains in Firebase Console.`
        );
      } else if (msg.includes('auth/operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        setError(
          'Email/Password sign-in is disabled in your Firebase console. Use Google Sign-In above, or enable Email/Password in Firebase Authentication settings.'
        );
      } else if (
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/wrong-password') ||
        msg.includes('auth/user-not-found')
      ) {
        setError('Invalid email or password.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try selecting "Already have account".');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="auth-modal-card"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-2xl relative my-8"
      >
        {/* Yellow Leaves Decorative Accents */}
        <div className="pointer-events-none absolute -top-4 -right-4 w-20 h-20 overflow-hidden">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full opacity-80">
            <path d="M100 0 C70 10 50 40 40 70" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
            <path d="M40 70 C30 50 50 30 70 40 C70 60 50 70 40 70 Z" fill="#facc15" />
            <path d="M70 40 C60 20 80 10 90 20 C90 35 75 45 70 40 Z" fill="#eab308" />
          </svg>
        </div>

        {/* Close Button */}
        <button
          type="button"
          id="close-auth-modal-btn"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Close dialog"
        >
          <X className="size-5" />
        </button>

        {/* Big Header */}
        <div className="pb-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
            <ShieldCheck className="size-3.5" />
            <span>EcoLeak Secure Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {mode === 'signin' ? 'Welcome Back to EcoLeak' : 'Join EcoLeak Platform'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signin'
              ? 'Access saved factory audits, track continuous CO₂e reductions, and export reports.'
              : 'Create your account to start auditing factory carbon leaks and generate reduction plans.'}
          </p>
        </div>

        {/* Prominent Two Options Selector: "Already have account" vs "New Account" */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-muted/80 my-4 border border-border">
          <button
            type="button"
            id="tab-mode-already-account"
            onClick={() => {
              setMode('signin');
              setError(null);
              setIsOperationNotAllowed(false);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-md border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface/40'
            }`}
          >
            <UserCheck className="size-4" />
            <span>Already have account</span>
          </button>

          <button
            type="button"
            id="tab-mode-new-account"
            onClick={() => {
              setMode('signup');
              setError(null);
              setIsOperationNotAllowed(false);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-md border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface/40'
            }`}
          >
            <UserPlus className="size-4" />
            <span>New Account</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>

            {isOperationNotAllowed && (
              <div className="pt-2 border-t border-destructive/20 text-muted-foreground space-y-2">
                <p className="text-[11px] leading-relaxed">
                  Firebase Email/Password provider is not active yet in your project console:
                </p>
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0147972194/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  <span>Open Firebase Authentication Settings</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/10 p-3.5 text-xs text-primary border border-primary/20">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Form for Email & Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Work / Factory Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="plant.manager@factory.com"
                className="w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              {mode === 'signup' && (
                <span className="text-[11px] text-muted-foreground font-mono">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 py-3 px-4 text-sm font-bold text-white shadow-md shadow-emerald-700/20 transition-all hover:shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="size-4" />
              </>
            ) : (
              <>
                <span>Create New Account</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-3 text-muted-foreground font-mono">Or quick single-click</span>
          </div>
        </div>

        {/* Google One-Click Login */}
        <button
          type="button"
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-border hover:border-emerald-600/50 bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-all shadow-xs disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="size-4 animate-spin text-emerald-600" />
          ) : (
            <svg className="size-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google Account'}</span>
        </button>

        {/* Footer Toggle text */}
        <div className="mt-5 text-center text-xs text-muted-foreground">
          {mode === 'signin' ? (
            <p>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Create New Account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Sign In to existing account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
