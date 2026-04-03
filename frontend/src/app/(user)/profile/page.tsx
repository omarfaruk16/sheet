'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Download, Heart, Clock, ShieldCheck, ChevronRight, LogOut, HelpCircle, Lock, Wallet } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { clearLocalSession, getAccessToken, getLocalSession } from '@/lib/userSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrderCount = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setOrderCount(0);
          return;
        }

        const res = await axios.get(`${API_URL}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrderCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        setOrderCount(0);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadOrderCount();
        setLoading(false);
        return;
      }

      const local = getLocalSession();
      if (local?.user) {
        setCurrentUser({
          displayName: local.user.name,
          email: local.user.email,
          metadata: { creationTime: new Date().toISOString() },
        });
        await loadOrderCount();
      } else {
        setCurrentUser(null);
        setOrderCount(0);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      clearLocalSession();
      if (auth.currentUser) {
        await signOut(auth);
      }
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
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return (currentUser.email?.slice(0, 2) || 'U').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
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
          <Link href="/profile/settings" className="text-gray-600 hover:text-gray-900">
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        {/* User Info Card */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xl">
            {getUserInitials()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
            <p className="text-gray-600">{displayEmail}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-green-600">{orderCount}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm mb-1">Member Since</p>
            <p className="text-sm font-semibold text-blue-600">
              {new Date(currentUser?.metadata?.creationTime || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="mt-6 space-y-2">
        {/* My Downloads */}
        <Link href="/profile/downloads" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-green-600" />
            <span className="font-medium">My Downloads</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Wishlist */}
        <Link href="/profile/wishlist" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-medium">Wishlist</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Order History */}
        <Link href="/profile/orders" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Order History</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        <Link href="/profile/transactions" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span className="font-medium">Transactions</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Verified Purchases */}
        <Link href="/profile/purchases" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="font-medium">Verified Purchases</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Security Settings */}
        <Link href="/profile/security" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-purple-600" />
            <span className="font-medium">Security Settings</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Help & Support */}
        <Link href="/support" className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-orange-600" />
            <span className="font-medium">Help & Support</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 transition text-red-600 font-medium"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

