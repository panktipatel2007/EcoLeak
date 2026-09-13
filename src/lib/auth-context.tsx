import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  firebaseReady: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseReady = isFirebaseConfigured() && auth !== null;

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firebaseReady]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase Auth is not configured.');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase Auth is not configured.');
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, firebaseReady, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
