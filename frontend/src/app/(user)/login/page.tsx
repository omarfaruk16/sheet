'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
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
      // Sync with backend
      const token = await userCred.user.getIdToken();
      await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: userCred.user.email })
      });

      toast.success('Login Successful!');
      router.push('/profile'); // Redirect after login
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to login');
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
      // Sync with backend
      const token = await userCred.user.getIdToken();
      await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email: userCred.user.email,
          name: userCred.user.displayName
        })
      });

      toast.success('Login with Google Successful!');
      router.push('/profile');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to login with Google');
      toast.error('Google Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome Back! 👋</h1>
          <p className="text-sm text-gray-500">Sign in to your LeafSheets account to access your library.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
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
            className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
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
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mt-6 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:active:scale-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="font-bold text-green-500 hover:underline">
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
}
