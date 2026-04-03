'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAxios } from '@/lib/adminAuth';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await adminAxios.get('/products');
      setProducts(res.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await adminAxios.delete(`/products/${id}`);
        toast.success('Product deleted');
        fetchProducts();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const filteredProducts = products.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 w-64 bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
          <Link
            href="/admin/products/new"
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl flex items-center transition-all font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Unique ID</th>
              <th className="px-6 py-4">Regular Price</th>
              <th className="px-6 py-4">Discount Price</th>
              <th className="px-6 py-4">Discount %</th>
              <th className="px-6 py-4">Chapters</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {search ? 'No products match your search.' : 'No products found. Click "Add Product" to create one.'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p: any) => {
                const hasDiscount = p.discountPrice && p.regularPrice > p.discountPrice;
                const discountPct = hasDiscount
                  ? Math.round(100 - (p.discountPrice / p.regularPrice) * 100)
                  : 0;
                return (
                  <tr key={p.id || p._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate">{p.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-mono border border-gray-200">
                        {p.uniqueId}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">৳{Number(p.regularPrice).toFixed(2)}</td>
                    <td className="px-6 py-4 font-medium text-blue-700">
                      {p.discountPrice ? `৳${Number(p.discountPrice).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {hasDiscount ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                          -{discountPct}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{p.chapters?.length || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(p.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/admin/products/edit/${p.id || p._id}`} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-block">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id || p._id, p.title)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
