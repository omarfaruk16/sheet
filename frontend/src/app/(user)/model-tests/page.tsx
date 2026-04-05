'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, ShoppingCart, FlaskConical, FileArchive, FileText } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1596496181871-9681eacf9764?w=300&q=80';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const base = API_URL.replace('/api', '');
  return `${base}${url}`;
};

export default function ModelTestsDiscoveryPage() {
  const [modelTests, setModelTests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mtRes, catRes] = await Promise.all([
          axios.get(`${API_URL}/model-tests`),
          axios.get(`${API_URL}/categories`),
        ]);
        setModelTests(mtRes.data);
        setCategories(catRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = modelTests.filter(mt => {
    const matchSearch = search ? mt.title?.toLowerCase().includes(search.toLowerCase()) : true;
    const matchCat = activeCategory ? (mt.category?._id === activeCategory || mt.categoryId === activeCategory) : true;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-purple-700 to-violet-900 text-white">
        <div className="flex items-center gap-3 mb-3">
          <FlaskConical className="w-7 h-7" />
          <h1 className="text-2xl font-black tracking-tight">Model Tests</h1>
        </div>
        <p className="text-purple-200 text-sm mb-5">Questions & Solutions bundles for exam preparation</p>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search model tests..."
              className="w-full pl-11 pr-4 py-3.5 bg-white/10 backdrop-blur border border-white/20 rounded-2xl text-sm text-white placeholder:text-purple-300 outline-none focus:ring-2 focus:ring-white/30 transition-all" />
          </div>
          <button className="p-3.5 bg-white/10 backdrop-blur border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            <button onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              All
            </button>
            {categories.map((cat: any) => (
              <button key={cat._id} onClick={() => setActiveCategory(activeCategory === cat._id ? null : cat._id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeCategory === cat._id ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <span>{cat.icon || '📝'}</span> {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model Tests List */}
      <div className="px-6 py-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">
              {search ? `Results for "${search}"` : 'All Model Tests 🧪'}
            </h3>
            <p className="text-xs text-gray-500">{filtered.length} test{filtered.length !== 1 ? 's' : ''} available</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (<div key={i} className="h-36 bg-gray-100 rounded-3xl animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-10 h-10 text-purple-300" />
            </div>
            <h4 className="text-lg font-bold text-gray-700 mb-1">No Model Tests Found</h4>
            <p className="text-sm text-gray-400">{search ? 'Try a different search term.' : 'Model tests will appear here once added from the admin panel.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((mt: any) => {
              const displayPrice = mt.discountPrice || mt.allItemsPrice || mt.regularPrice;
              const hasDiscount = mt.discountPrice && mt.regularPrice > mt.discountPrice;
              return (
                <Link key={mt._id || mt.id} href={`/model-tests/${mt._id || mt.id}`}
                  className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md hover:border-purple-100 active:scale-[0.98]">
                  {/* Cover */}
                  <div className="w-24 h-32 shrink-0 rounded-2xl overflow-hidden relative bg-gray-100 shadow-inner">
                    {mt.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getImageUrl(mt.coverImage)} alt={mt.title} className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596496181871-9681eacf9764?w=300&q=80'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><FlaskConical className="w-10 h-10" /></div>
                    )}
                    <div className="absolute top-2 left-2 bg-purple-600/90 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full text-white shadow-sm">TEST</div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col py-1 justify-between flex-1 min-w-0">
                    <div>
                      <h4 className="font-bold text-gray-900 leading-snug text-sm mb-1 pr-2 line-clamp-2">{mt.title}</h4>
                      <p className="text-xs text-gray-400 mb-2">
                        {mt.category?.name || 'Model Test'} · {mt.items?.length || 0} item{mt.items?.length !== 1 ? 's' : ''}
                      </p>
                      {mt.items?.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="flex items-center gap-0.5 text-blue-500"><FileArchive className="w-3 h-3" /> ZIP</span>
                          <span className="flex items-center gap-0.5 text-green-500"><FileText className="w-3 h-3" /> PDF</span>
                          <span>per item</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-purple-600">৳{displayPrice?.toFixed(2)}</span>
                        {hasDiscount && <span className="text-xs text-gray-400 line-through">৳{mt.regularPrice?.toFixed(2)}</span>}
                      </div>
                      <button onClick={e => { e.preventDefault(); }}
                        className="w-8 h-8 rounded-full bg-purple-900 text-white flex items-center justify-center shadow-md hover:bg-purple-600 transition-colors">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
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
