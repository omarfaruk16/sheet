'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, ShoppingCart, FlaskConical, FileArchive, FileText } from 'lucide-react';
import axios from 'axios';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=300&q=80';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const base = API_URL.replace('/api', '');
  return `${base}${url}`;
};

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [modelTests, setModelTests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, mtRes] = await Promise.all([
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/categories`),
          axios.get(`${API_URL}/model-tests`),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setModelTests(mtRes.data);
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

  // Get user initials from displayName or email
  const getUserInitials = () => {
    if (!currentUser) return '?';
    if (currentUser.displayName) {
      const parts = currentUser.displayName.trim().split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return (currentUser.email?.slice(0, 2) || '?').toUpperCase();
  };

  const getUserName = () => {
    if (!currentUser) return 'Guest';
    return currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  };

  return (
    <div className="min-h-screen bg-white pb-20">

      {/* Search Bar */}
      <div className="px-6 pt-5 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search textbooks, notes, or sheets..."
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <button className="p-3.5 bg-gray-50 rounded-2xl text-gray-600 hover:bg-gray-100 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="px-6 mb-8 flex gap-4">
        <div className="relative w-full h-40 rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-green-700 to-emerald-900">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-sm">Offer</span>
              <span className="text-[10px] font-bold text-green-200 uppercase tracking-wider">Exam Season</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sheet Bundle 2024</h3>
            <p className="text-xs text-green-100 mb-4 max-w-[220px]">Comprehensive HSC formula sheets &amp; suggestion books at 30% off.</p>
            <button className="bg-white hover:bg-green-50 text-green-800 text-xs font-bold px-4 py-2 rounded-full self-start shadow-sm transition-colors">
              View Collection
            </button>
          </div>
        </div>

        <div className="relative w-full h-40 rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-orange-700 to-orange-900">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-sm">Offer</span>
              <span className="text-[10px] font-bold text-orange-200 uppercase tracking-wider">Exam Season</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sheet Bundle 2024</h3>
            <p className="text-xs text-orange-100 mb-4 max-w-[220px]">Comprehensive HSC formula sheets &amp; suggestion books at 30% off.</p>
            <button className="bg-white hover:bg-orange-50 text-orange-800 text-xs font-bold px-4 py-2 rounded-full self-start shadow-sm transition-colors">
              View Collection
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-6 mb-8">
          <h3 className="text-lg font-black text-gray-900 mb-4">Categories</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(activeCategory === cat._id ? null : cat._id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeCategory === cat._id ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <span>{cat.icon || '📚'}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">
              {search ? `Results for "${search}"` : 'All Sheets ✨'}
            </h3>
            <p className="text-xs text-gray-500">{filtered.length} sheet{filtered.length !== 1 ? 's' : ''} available</p>
          </div>
          <Link href="/products" className="text-xs font-bold text-green-500 hover:text-green-600 transition-colors bg-green-50 px-3 py-1.5 rounded-full">
            See All
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 bg-gray-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-700 mb-1">No Sheets Found</h4>
            <p className="text-sm text-gray-400">
              {search ? 'Try a different search term.' : 'Sheets will appear here once added from the admin panel.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((prod: any) => {
              const hasDiscount = prod.discountPrice && prod.regularPrice > prod.discountPrice;
              const displayPrice = prod.discountPrice || prod.allChaptersPrice || prod.regularPrice;
              return (
                <Link
                  key={prod._id}
                  href={`/products/${prod._id}`}
                  className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md hover:border-green-100 active:scale-[0.98]"
                >
                  {/* Cover */}
                  <div className="w-24 h-32 shrink-0 rounded-2xl overflow-hidden relative bg-gray-100 shadow-inner">
                    {prod.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(prod.coverImage)}
                        alt={prod.title}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=300&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full text-gray-800 shadow-sm">PDF</div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col py-1 justify-between flex-1 min-w-0">
                    <div>
                      <h4 className="font-bold text-gray-900 leading-snug text-sm mb-1 pr-2 line-clamp-2">{prod.title}</h4>
                      <p className="text-xs text-gray-400 mb-2">
                        {prod.category?.name || 'Sheet'} · {prod.chapters?.length || 0} chapter{prod.chapters?.length !== 1 ? 's' : ''}
                      </p>
                      {prod.chapters?.length > 0 && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {prod.chapters.slice(0, 2).map((c: any) => c.name).join(', ')}
                          {prod.chapters.length > 2 ? ` +${prod.chapters.length - 2} more` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-green-600">
                          ৳{displayPrice?.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-gray-400 line-through">৳{prod.regularPrice?.toFixed(2)}</span>
                        )}
                      </div>
                      <button
                        onClick={e => { e.preventDefault(); }}
                        className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md hover:bg-green-600 transition-colors"
                      >
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

      {/* Model Tests Section */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">Model Tests 🧪</h3>
            <p className="text-xs text-gray-500">{modelTests.length} test{modelTests.length !== 1 ? 's' : ''} available</p>
          </div>
          <Link href="/model-tests" className="text-xs font-bold text-purple-500 hover:text-purple-600 transition-colors bg-purple-50 px-3 py-1.5 rounded-full">
            See All
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map(i => (<div key={i} className="h-36 bg-gray-100 rounded-3xl animate-pulse" />))}
          </div>
        ) : modelTests.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FlaskConical className="w-8 h-8 text-purple-300" />
            </div>
            <p className="text-sm text-gray-400">No model tests available yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {modelTests.slice(0, 4).map((mt: any) => {
              const displayPrice = mt.discountPrice || mt.allItemsPrice || mt.regularPrice;
              const hasDiscount = mt.discountPrice && mt.regularPrice > mt.discountPrice;
              return (
                <Link key={mt._id || mt.id} href={`/model-tests/${mt._id || mt.id}`}
                  className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md hover:border-purple-100 active:scale-[0.98]">
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
                  <div className="flex flex-col py-1 justify-between flex-1 min-w-0">
                    <div>
                      <h4 className="font-bold text-gray-900 leading-snug text-sm mb-1 pr-2 line-clamp-2">{mt.title}</h4>
                      <p className="text-xs text-gray-400 mb-1">{mt.category?.name || 'Model Test'} · {mt.items?.length || 0} items</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-0.5 text-blue-500"><FileArchive className="w-3 h-3" /> ZIP</span>
                        <span className="flex items-center gap-0.5 text-green-500"><FileText className="w-3 h-3" /> PDF</span>
                        <span className="text-gray-400">per item</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-purple-600">৳{displayPrice?.toFixed(2)}</span>
                        {hasDiscount && <span className="text-xs text-gray-400 line-through">৳{mt.regularPrice?.toFixed(2)}</span>}
                      </div>
                      <button onClick={e => e.preventDefault()} className="w-8 h-8 rounded-full bg-purple-900 text-white flex items-center justify-center shadow-md hover:bg-purple-600 transition-colors">
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
