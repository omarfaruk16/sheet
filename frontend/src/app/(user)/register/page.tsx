'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import toast from 'react-hot-toast';
import { clearLocalSession, setLocalSession, type LocalSessionUser } from '@/lib/userSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type ErrorLike = {
  code?: string;
  message?: string;
};

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

const toErrorLike = (error: unknown): ErrorLike => {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>;
    return {
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      message: typeof candidate.message === 'string' ? candidate.message : undefined,
    };
  }
  return {};
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = toErrorLike(error);
  return err.message || fallback;
};

const shouldUseLocalFallback = (error: unknown) => {
  const err = toErrorLike(error);
  const code = (err?.code || '').toLowerCase();
  const message = (err?.message || '').toLowerCase();
  return (
    code.includes('api-key-not-valid') ||
    code.includes('invalid-api-key') ||
    message.includes('api-key-not-valid') ||
    message.includes('invalid api key')
  );
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const redirectTo = searchParams.get('redirect') || '/profile';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return setError('Please fill in all fields');
    if (password.length < 6) return setError('Password must be at least 6 characters long');
    setError('');
    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      
      // Call backend API to sync user
      try {
        const token = await user.getIdToken();
        await fetch(API_URL + '/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: user.email, name })
        });
      } catch (syncError) {
        console.error('Failed to sync user with backend', syncError);
      }
      
      clearLocalSession();
      toast.success('Account Created Successfully!');
      router.push(redirectTo);
    } catch (err: unknown) {
      if (shouldUseLocalFallback(err)) {
        try {
          const res = await fetch(API_URL + '/auth/register-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          });

          const data = (await res.json()) as Partial<LocalAuthSuccess> & { message?: string };
          if (!res.ok) {
            const message = data?.message || 'Local registration failed';
            setError(message);
            toast.error('Registration Failed');
            return;
          }

          if (!data.token || !data.user) {
            setError('Local registration failed');
            toast.error('Registration Failed');
            return;
          }

          const localUser = toLocalSessionUser(data.user);
          if (!localUser) {
            setError('Local registration failed');
            toast.error('Registration Failed');
            return;
          }

          setLocalSession({ token: data.token, user: localUser });
          toast.success('Account Created Successfully!');
          router.push(redirectTo);
          return;
        } catch (fallbackError: unknown) {
          console.error(fallbackError);
          setError(getErrorMessage(fallbackError, 'Failed to register'));
          toast.error('Registration Failed');
          return;
        }
      }

      console.error(err);
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
      
      // Call backend API to sync user
      try {
        const token = await user.getIdToken();
        await fetch(API_URL + '/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.email,
            name: user.displayName || user.email?.split('@')[0],
          })
        });
      } catch (syncError) {
        console.error('Failed to sync user with backend', syncError);
      }

      clearLocalSession();
      toast.success('Registered with Google Successfully!');
      router.push(redirectTo);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to register with Google'));
      toast.error('Google Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Create Account 🎉</h1>
          <p className="text-sm text-gray-500">Join Orbit Sheet to purchase and store your premium PDF guides.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
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
            className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full mt-6 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:active:scale-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Already have an account?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="font-bold text-green-500 hover:underline">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

