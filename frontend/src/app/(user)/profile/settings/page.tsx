'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {ArrowLeft, Camera, KeyRound, Loader2, Save, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getAccessToken } from '@/lib/userSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setDisplayName(user.displayName || '');
        setPhotoURL(user.photoURL || '');
        setEmail(user.email || '');
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await axios.post(`${API_URL}/users/upload-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setPhotoURL(res.data.url);
      toast.success('Image uploaded temporarily. Save changes to apply.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(currentUser, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
      });

      // 2. Sync with Backend
      const token = await getAccessToken();
      await axios.post(
        `${API_URL}/auth/sync`,
        { name: displayName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Profile updated successfully!');
      router.push('/profile');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarSrc = () => {
    if (photoURL) return photoURL;
    if (email) return `https://unavatar.io/${email}`;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Profile Settings</h1>
        </div>
      </div>

      <div className="px-6 max-w-lg mx-auto">
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6">
          
          {/* Avatar Edit Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-md flex items-center justify-center">
                {getAvatarSrc() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getAvatarSrc() as string} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-gray-400" />
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full text-white flex items-center justify-center border-2 border-white shadow-md hover:bg-green-600 transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center leading-relaxed">
              Click the camera icon to upload a new avatar.<br />
              Leave blank to use your email's avatar.
            </p>
          </div>

          <div className="w-full h-[1px] bg-gray-100"></div>

          {/* Details Edit Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Email (Cannot be changed)</label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
                {email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>

            {/* Change Password Link */}
            <Link
              href="/profile/settings/password"
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-6 rounded-xl transition-all active:scale-95"
            >
              <KeyRound className="w-5 h-5" />
              Change Password
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}
