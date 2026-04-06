'use client';

import { useState, useEffect } from 'react';
import { adminAxios } from '@/lib/adminAuth';
import { Tag, Plus, Pencil, Trash2, X, Check, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const emptyForm = {
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  value: '',
  maxUses: '',
  isActive: true,
  expiresAt: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCoupons = async () => {
    try {
      const { data } = await adminAxios.get('/coupons');
      setCoupons(data);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      maxUses: coupon.maxUses !== null ? String(coupon.maxUses) : '',
      isActive: coupon.isActive,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return toast.error('Code and value are required.');

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        isActive: form.isActive,
        expiresAt: form.expiresAt || null,
      };

      if (editingId) {
        await adminAxios.put(`/coupons/${editingId}`, payload);
        toast.success('Coupon updated!');
      } else {
        await adminAxios.post('/coupons', payload);
        toast.success('Coupon created!');
      }

      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    setDeletingId(id);
    try {
      await adminAxios.delete(`/coupons/${id}`);
      toast.success('Coupon deleted');
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error('Failed to delete coupon');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await adminAxios.put(`/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated');
    } catch {
      toast.error('Failed to update coupon status');
    }
  };

  const isExpired = (expiresAt: string | null) => expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Coupons</h2>
          <p className="text-sm text-gray-500 mt-1">Manage discount codes for your users</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Coupon
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Coupons', value: coupons.length, color: 'text-gray-900' },
          { label: 'Active', value: coupons.filter(c => c.isActive).length, color: 'text-green-600' },
          { label: 'Total Uses', value: coupons.reduce((s, c) => s + c.usedCount, 0), color: 'text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No coupons yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first coupon to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="text-center px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Uses</th>
                  <th className="text-center px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg tracking-wider text-xs">
                          {coupon.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        coupon.type === 'percent'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {coupon.type === 'percent' ? `${coupon.value}% OFF` : `৳${coupon.value} OFF`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-gray-800">{coupon.usedCount}</span>
                      {coupon.maxUses !== null && (
                        <span className="text-gray-400"> / {coupon.maxUses}</span>
                      )}
                      {coupon.maxUses === null && (
                        <span className="text-gray-400 text-xs"> (∞)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className="inline-flex items-center gap-1.5 transition-colors"
                        title={coupon.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.isActive
                          ? <ToggleRight className="w-6 h-6 text-green-500" />
                          : <ToggleLeft className="w-6 h-6 text-gray-400" />
                        }
                        <span className={`text-xs font-semibold ${coupon.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {isExpired(coupon.expiresAt) ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {coupon.expiresAt ? (
                        <span className={`text-xs ${isExpired(coupon.expiresAt) ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                          {new Date(coupon.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          disabled={deletingId === coupon.id}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === coupon.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Coupon' : 'Create Coupon'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Coupon Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE20"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Discount Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['percent', 'fixed'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        form.type === t
                          ? t === 'percent'
                            ? 'bg-purple-50 border-purple-500 text-purple-700'
                            : 'bg-orange-50 border-orange-500 text-orange-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t === 'percent' ? '📉 Percentage (%)' : '💰 Fixed Amount (৳)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  {form.type === 'percent' ? 'Discount % *' : 'Discount Amount (৳) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    {form.type === 'percent' ? '%' : '৳'}
                  </span>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percent' ? '0–100' : 'e.g. 50'}
                    min="0.01"
                    max={form.type === 'percent' ? 100 : undefined}
                    step="0.01"
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Max Uses & Expiry in a row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Max Uses</label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={e => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-gray-700">Active</p>
                  <p className="text-xs text-gray-500">Coupon can be used by customers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
