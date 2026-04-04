'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, User, AlertCircle, Loader2, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  clearLocalSession,
  setLocalSession,
  type LocalSessionUser,
} from '@/lib/userSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type ErrorLike = { code?: string; message?: string };
type LocalAuthSuccess = {
  token: string;
  user: {
    id?: string;
    uid?: string;
    name?: string;
    email?: string;
    role?: string;
    authProvider?: 'local' | 'firebase';
  };
};

const parseError = (error: unknown): ErrorLike => {
  if (typeof error === 'object' && error !== null) {
    const c = error as Record<string, unknown>;
    return {
      code: typeof c.code === 'string' ? c.code : undefined,
      message: typeof c.message === 'string' ? c.message : undefined,
    };
  }
  return {};
};

const getErrorMessage = (error: unknown, fallback: string) =>
  parseError(error).message || fallback;

const shouldUseLocalFallback = (error: unknown) => {
  const err = parseError(error);
  const code = (err?.code || '').toLowerCase();
  const message = (err?.message || '').toLowerCase();
  return (
    code.includes('api-key-not-valid') ||
    code.includes('invalid-api-key') ||
    message.includes('api-key-not-valid') ||
    message.includes('invalid api key')
  );
};

const toLocalSessionUser = (user: LocalAuthSuccess['user']): LocalSessionUser | null => {
  if (!user.uid) return null;
  return {
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: 'local',
  };
};

// ─── Google SVG ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Please fill in all fields');
    setError('');
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCred.user.getIdToken();
      await fetch(API_URL + '/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: userCred.user.email, name: userCred.user.displayName }),
      });
      clearLocalSession();
      toast.success('Login Successful!');
      onSuccess();
    } catch (err: unknown) {
      if (shouldUseLocalFallback(err)) {
        try {
          const res = await fetch(API_URL + '/auth/login-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = (await res.json()) as Partial<LocalAuthSuccess> & { message?: string };
          if (!res.ok || !data.token || !data.user) {
            setError(data?.message || 'Login failed');
            toast.error('Login Failed');
            return;
          }
          const localUser = toLocalSessionUser(data.user);
          if (!localUser) { setError('Login failed'); toast.error('Login Failed'); return; }
          setLocalSession({ token: data.token, user: localUser });
          toast.success('Login Successful!');
          onSuccess();
          return;
        } catch (fallbackErr: unknown) {
          setError(getErrorMessage(fallbackErr, 'Failed to login'));
          toast.error('Login Failed');
          return;
        }
      }
      setError(getErrorMessage(err, 'Failed to login'));
      toast.error('Login Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const token = await userCred.user.getIdToken();
      await fetch(API_URL + '/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: userCred.user.email, name: userCred.user.displayName }),
      });
      clearLocalSession();
      toast.success('Login with Google Successful!');
      onSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to login with Google'));
      toast.error('Google Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-900 mb-1">Welcome Back! 👋</h2>
        <p className="text-sm text-gray-500">Sign in to your LeafSheets account.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all focus:bg-white"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center mt-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>

      <div className="mt-5">
        <div className="relative flex items-center">
          <div className="flex-1 border-t border-gray-100" />
          <span className="px-3 text-xs text-gray-400 bg-white">Or continue with</span>
          <div className="flex-1 border-t border-gray-100" />
        </div>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-4 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-70"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <button onClick={onSwitchToRegister} className="font-bold text-green-500 hover:underline">
          Register Here
        </button>
      </p>
    </div>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────
interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return setError('Please fill in all fields');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setError('');
    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      try {
        const token = await user.getIdToken();
        await fetch(API_URL + '/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: user.email, name }),
        });
      } catch (syncErr) {
        console.error('Failed to sync user', syncErr);
      }
      clearLocalSession();
      toast.success('Account Created Successfully!');
      onSuccess();
    } catch (err: unknown) {
      if (shouldUseLocalFallback(err)) {
        try {
          const res = await fetch(API_URL + '/auth/register-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          });
          const data = (await res.json()) as Partial<LocalAuthSuccess> & { message?: string };
          if (!res.ok || !data.token || !data.user) {
            setError(data?.message || 'Registration failed');
            toast.error('Registration Failed');
            return;
          }
          const localUser = toLocalSessionUser(data.user);
          if (!localUser) { setError('Registration failed'); toast.error('Registration Failed'); return; }
          setLocalSession({ token: data.token, user: localUser });
          toast.success('Account Created Successfully!');
          onSuccess();
          return;
        } catch (fallbackErr: unknown) {
          setError(getErrorMessage(fallbackErr, 'Failed to register'));
          toast.error('Registration Failed');
          return;
        }
      }
      setError(getErrorMessage(err, 'Failed to register'));
      toast.error('Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      try {
        const token = await user.getIdToken();
        await fetch(API_URL + '/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: user.email, name: user.displayName || user.email?.split('@')[0] }),
        });
      } catch (syncErr) {
        console.error('Failed to sync user', syncErr);
      }
      clearLocalSession();
      toast.success('Registered with Google Successfully!');
      onSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to register with Google'));
      toast.error('Google Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-900 mb-1">Create Account 🎉</h2>
        <p className="text-sm text-gray-500">Join LeafSheets to access your premium PDFs.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all focus:bg-white"
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all focus:bg-white"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="password"
            placeholder="Password (6+ chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center mt-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
        </button>
      </form>

      <div className="mt-5">
        <div className="relative flex items-center">
          <div className="flex-1 border-t border-gray-100" />
          <span className="px-3 text-xs text-gray-400 bg-white">Or continue with</span>
          <div className="flex-1 border-t border-gray-100" />
        </div>
        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full mt-4 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-70"
        >
          <GoogleIcon />
          Sign up with Google
        </button>
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="font-bold text-green-500 hover:underline">
          Login Here
        </button>
      </p>
    </div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────
export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) setTab(defaultTab);
  }, [isOpen, defaultTab]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        {tab === 'login' ? (
          <LoginForm onSuccess={handleSuccess} onSwitchToRegister={() => setTab('register')} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} onSwitchToLogin={() => setTab('login')} />
        )}
      </div>
    </div>
  );
}
