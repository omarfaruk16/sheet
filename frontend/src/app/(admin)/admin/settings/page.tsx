'use client';

import { useState, useEffect } from 'react';
import { adminAxios } from '@/lib/adminAuth';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

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
              {saving ? 'Saving...' : <><Save className="w-5 h-5"/> Save Settings</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
