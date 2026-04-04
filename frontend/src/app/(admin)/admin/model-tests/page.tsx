'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Search, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAxios } from '@/lib/adminAuth';

export default function AdminModelTests() {
  const [modelTests, setModelTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchModelTests = async () => {
    try {
      setLoading(true);
      const res = await adminAxios.get('/model-tests');
      setModelTests(res.data);
    } catch (error) {
      toast.error('Failed to load model tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelTests();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await adminAxios.delete(`/model-tests/${id}`);
        toast.success('Model test deleted');
        fetchModelTests();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete model test');
      }
    }
  };

  const filtered = modelTests.filter((mt: any) =>
    mt.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-7 h-7 text-purple-600" />
          <h2 className="text-2xl font-bold tracking-tight">Model Tests</h2>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search model tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 w-64 bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
          <Link
            href="/admin/model-tests/new"
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center transition-all font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Model Test
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Unique ID</th>
              <th className="px-6 py-4">Regular Price</th>
              <th className="px-6 py-4">All Items Price</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading model tests...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                {search ? 'No model tests match your search.' : 'No model tests found. Click "Add Model Test" to create one.'}
              </td></tr>
            ) : (
              filtered.map((mt: any) => (
                <tr key={mt.id || mt._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 max-w-xs truncate flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-purple-500 shrink-0" />
                      {mt.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-mono border border-purple-100">
                      {mt.uniqueId}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">৳{Number(mt.regularPrice).toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium text-purple-700">৳{Number(mt.allItemsPrice).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500">{mt.items?.length || 0}</td>
                  <td className="px-6 py-4 text-gray-500">{mt.category?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(mt.createdAt || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link href={`/admin/model-tests/edit/${mt.id || mt._id}`} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-block">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(mt.id || mt._id, mt.title)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
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
