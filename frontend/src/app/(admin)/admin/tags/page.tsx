'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAxios } from '@/lib/adminAuth';

export default function AdminTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data } = await adminAxios.get(`/tags`);
      setTags(data);
    } catch (error) {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Tag name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await adminAxios.put(`/tags/${editingId}`, { name: name.trim() });
        toast.success('Tag updated successfully');
      } else {
        await adminAxios.post(`/tags`, { name: name.trim() });
        toast.success('Tag created successfully');
      }
      setIsOpen(false);
      setName('');
      setEditingId(null);
      fetchTags();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast.error(msg || (editingId ? 'Failed to update tag' : 'Failed to create tag'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await adminAxios.delete(`/tags/${id}`);
      toast.success('Tag deleted');
      fetchTags();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast.error(msg || 'Failed to delete tag');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Tags</h2>
        <button
          onClick={() => { setIsOpen(true); setName(''); setEditingId(null); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Tag
        </button>
      </div>

      {/* Form Panel */}
      {isOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Tag' : 'New Tag'}</h3>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                disabled={submitting}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all disabled:opacity-60"
                placeholder="e.g. Biology"
              />
            </div>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setName(''); setEditingId(null); }}
              disabled={submitting}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {/* Tags Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Slug</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : tags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No tags found. Click "Add Tag" to create one.
                </td>
              </tr>
            ) : (
              tags.map((tag: any) => (
                <tr key={tag._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{tag.name}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-sm">{tag.slug}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(tag._id);
                        setName(tag.name);
                        setIsOpen(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag._id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
