import { useState, FormEvent } from 'react';
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
  ChevronDown,
  ChevronUp,
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
  const [showEmailForm, setShowEmailForm] = useState(false);

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
      if (msg.includes('auth/operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        setError(
          'Email/Password sign-in is disabled in your Firebase console. Use Google Sign-In above, or enable Email/Password in Firebase Authentication settings.'
        );
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setError('Invalid email or password.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try signing in instead.');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="auth-modal-card"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Sign In to EcoLeak
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access saved factory audits, track carbon reductions, and export reports.
            </p>
          </div>
          <button
            type="button"
            id="close-auth-modal-btn"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>

            {isOperationNotAllowed && (
              <div className="pt-2 border-t border-destructive/20 text-muted-foreground space-y-2">
                <p className="text-[11px] leading-relaxed">
                  Firebase disables Email/Password auth by default. To enable it:
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-1">
                  <li>Open the Firebase Console link below.</li>
                  <li>Click <strong>Email/Password</strong> under Sign-in providers.</li>
                  <li>Toggle <strong>Enable</strong> and click <strong>Save</strong>.</li>
                </ol>
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0147972194/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  <span>Open Firebase Authentication Console</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-xs text-primary border border-primary/20">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Primary Recommended Option: Google Sign-in */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Recommended Method</span>
            <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Pre-configured
            </span>
          </div>

          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-border hover:border-primary/50 bg-background px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition-all shadow-xs disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
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
            <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Accordion / Alternative: Email & Password */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span>Or use Email & Password</span>
            {showEmailForm ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showEmailForm && (
            <div className="mt-3 space-y-3">
              {/* Tab switcher */}
              <div className="flex rounded-lg bg-muted/60 p-1">
                <button
                  type="button"
                  id="tab-mode-signin"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setIsOperationNotAllowed(false);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'signin'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-mode-signup"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setIsOperationNotAllowed(false);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'signup'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@factory.com"
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="auth-submit-btn"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : mode === 'signin' ? (
                    'Sign In with Email'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
