'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, ShoppingCart, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/categories`),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = search ? p.title?.toLowerCase().includes(search.toLowerCase()) : true;
    const matchCat = activeCategory ? (p.category?._id === activeCategory || p.category === activeCategory) : true;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Discover Products</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search textbooks, notes..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 shadow-sm rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
            >
              All
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(activeCategory === cat._id ? null : cat._id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeCategory === cat._id ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
              >
                <span>{cat.icon || '📚'}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="px-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-700 mb-1">No Products Found</h4>
            <p className="text-sm text-gray-400">Try a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((prod: any) => {
              const hasDiscount = prod.discountPrice && prod.regularPrice > prod.discountPrice;
              const displayPrice = prod.discountPrice || prod.allChaptersPrice || prod.regularPrice;
              return (
                <Link
                  key={prod._id}
                  href={`/products/${prod._id}`}
                  className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 transition-all hover:shadow-md hover:border-green-100 active:scale-[0.98]"
                >
                  <div className="w-full aspect-[3/4] rounded-xl overflow-hidden relative bg-gray-50">
                    {prod.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.coverImage} alt={prod.title} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=300&q=80'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{prod.title}</h4>
                    <p className="text-[10px] text-gray-400 mb-2">{prod.category?.name || 'Sheet'}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-sm font-black text-green-600">৳{displayPrice?.toFixed(2)}</span>
                      <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-green-600 transition-colors">
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
