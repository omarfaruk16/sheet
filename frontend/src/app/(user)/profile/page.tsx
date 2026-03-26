'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Download, Heart, Clock, ShieldCheck, ChevronRight, LogOut, HelpCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);
      setLoading(false);
        try {
          const token = await user.getIdToken();
          const res = await axios.get(
            (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') + '/orders/my',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setOrderCount(Array.isArray(res.data) ? res.data.length : 0);
        } catch {
          // Non-critical, leave count at 0
        }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const getUserInitials = () => {
    if (!currentUser) return '?';
    if (currentUser.displayName) {
      const parts = currentUser.displayName.trim().split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return (currentUser.email?.slice(0, 2) || 'U').toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const displayEmail = currentUser?.email || 'No email';

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header Profile Section */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[40px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-50 rounded-bl-full -z-10 opacity-50"></div>
        
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {currentUser?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-white shadow-md flex items-center justify-center text-green-700 text-2xl font-bold relative">
              {getUserInitials()}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h2>
            <p className="text-xs text-gray-500 mb-1">{displayEmail}</p>
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-md inline-block">
              {currentUser ? 'Member' : 'Guest'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Library</p>
              <p className="text-lg font-black text-gray-900">{orderCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Orders</p>
              <p className="text-lg font-black text-gray-900">{orderCount}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <Link href="/profile/downloads" className="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium text-gray-900">My Library & Downloads</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </Link>

          <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-medium text-gray-900">Saved & Wishlist</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
              <span className="font-medium text-gray-900">Account Security</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-gray-500" />
              </div>
              <span className="font-medium text-gray-900">Help & Support</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <span className="font-medium text-red-600">Logout</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
