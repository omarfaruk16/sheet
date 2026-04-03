'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminAxios } from '@/lib/adminAuth';
import toast from 'react-hot-toast';
import { Save, Lock, ChevronRight } from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bkashNumber: '',
    nagadNumber: '',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminAxios.get('/settings');
      setFormData({
        bkashNumber: res.data.bkashNumber || '',
        nagadNumber: res.data.nagadNumber || '',
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAxios.put('/settings', formData);
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold tracking-tight">Payment Settings</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Security</h3>
        <Link href="/admin/settings/password" className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Change Password</p>
              <p className="text-xs text-gray-500">Update your admin account password</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
             <h3 className="text-lg font-bold border-b border-gray-100 pb-3 mb-5">Mobile Banking Numbers</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">bKash Number</label>
                 <input 
                   type="text" 
                   value={formData.bkashNumber} 
                   onChange={(e) => setFormData({...formData, bkashNumber: e.target.value})}
                   placeholder="e.g. 01700000000"
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#e2136e] outline-none transition-all"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nagad Number</label>
                 <input 
                   type="text" 
                   value={formData.nagadNumber} 
                   onChange={(e) => setFormData({...formData, nagadNumber: e.target.value})}
                   placeholder="e.g. 01800000000"
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ed1c24] outline-none transition-all"
                 />
               </div>
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? 'Saving...' : (<><Save className="w-5 h-5"/> Save Settings</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
