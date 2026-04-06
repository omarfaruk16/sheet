'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, ShoppingCart, FlaskConical, FileArchive, FileText } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_URL.replace('/api', '')}${url}`;
};

type Tab = 'products' | 'modelTests';

export default function DiscoverPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [modelTests, setModelTests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [loading, setLoading] = useState(true);

  const normalizeArray = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.products)) return value.products;
    return [];
  };

  const getEntityId = (entity: any) => entity?._id || entity?.id;

  const addProductToCart = (event: React.MouseEvent, prod: any) => {
    event.preventDefault();
    event.stopPropagation();

    const chapters = Array.isArray(prod?.chapters)
      ? prod.chapters.map((ch: any) => ({
          name: ch?.name,
          pdfUrl: ch?.pdfUrl,
          price: Number(ch?.price) || 0,
        }))
      : [];

    const cartItem = {
      id: Math.random().toString(36).substr(2, 9),
      itemType: 'product',
      productId: getEntityId(prod),
      productTitle: prod?.title || 'PDF Sheet',
      cover: prod?.coverImage,
      price: Number(prod?.discountPrice ?? prod?.allChaptersPrice ?? prod?.regularPrice ?? 0),
      chapters,
      isAllChapters: true,
      headerLeftText: '',
      headerRightText: '',
      watermarkText: '',
      coverPageText: '',
    };

    if (!cartItem.productId) {
      return;
    }

    const existing = JSON.parse(localStorage.getItem('leafsheets_cart') || '[]');
    localStorage.setItem('leafsheets_cart', JSON.stringify([...existing, cartItem]));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, mtRes] = await Promise.allSettled([
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/categories`),
          axios.get(`${API_URL}/model-tests`),
        ]);

        if (prodRes.status === 'fulfilled') {
          setProducts(normalizeArray(prodRes.value.data));
        } else {
          setProducts([]);
        }

        if (catRes.status === 'fulfilled') {
          setCategories(normalizeArray(catRes.value.data));
        } else {
          setCategories([]);
        }

        if (mtRes.status === 'fulfilled') {
          setModelTests(normalizeArray(mtRes.value.data));
        } else {
          setModelTests([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filterBySearch = (item: any) =>
    search ? item.title?.toLowerCase().includes(search.toLowerCase()) : true;

  const filterByCat = (item: any) =>
    activeCategory
      ? (item?.category?._id || item?.category?.id || item?.categoryId || item?.category) === activeCategory
      : true;

  const filteredProducts = products.filter(p => filterBySearch(p) && filterByCat(p));
  const filteredModelTests = modelTests.filter(mt => filterBySearch(mt) && filterByCat(mt));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'products', label: '📚 Sheets', count: filteredProducts.length },
    { key: 'modelTests', label: '🧪 Model Tests', count: filteredModelTests.length },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-white sticky top-0 z-20 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Documents</h1>

        {/* Search */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sheets & model tests..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <button className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-100 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {categories.map((cat: any) => (
              <button
                key={getEntityId(cat)}
                onClick={() => {
                  const id = getEntityId(cat);
                  setActiveCategory(activeCategory === id ? null : id);
                }}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeCategory === getEntityId(cat) ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <span>{cat.icon || '📚'}</span> {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 pt-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : activeTab === 'products' ? (
          filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-700 mb-1">No Sheets Found</h4>
              <p className="text-sm text-gray-400">Try a different category or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((prod: any) => {
                const hasDiscount = prod.discountPrice && prod.regularPrice > prod.discountPrice;
                const displayPrice = prod.discountPrice || prod.allChaptersPrice || prod.regularPrice;
                return (
                  <Link key={getEntityId(prod)} href={`/products/${getEntityId(prod)}`}
                    className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 transition-all hover:shadow-md hover:border-green-100 active:scale-[0.98]">
                    <div className="w-full aspect-[3/4] rounded-xl overflow-hidden relative bg-gray-50">
                      {prod.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getImageUrl(prod.coverImage) || ''} alt={prod.title} className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=300&q=80'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><BookOpen className="w-10 h-10" /></div>
                      )}
                      {hasDiscount && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          SALE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1">
                      <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{prod.title}</h4>
                      <p className="text-[10px] text-gray-400 mb-2">{prod.category?.name || 'Sheet'}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-green-600">৳{displayPrice?.toFixed(2)}</span>
                          {hasDiscount && <span className="text-[10px] text-gray-400 line-through ml-1">৳{prod.regularPrice?.toFixed(2)}</span>}
                        </div>
                        <button
                          onClick={(e) => addProductToCart(e, prod)}
                          className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          /* Model Tests Tab */
          filteredModelTests.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-8 h-8 text-purple-300" />
              </div>
              <h4 className="text-lg font-bold text-gray-700 mb-1">No Model Tests Found</h4>
              <p className="text-sm text-gray-400">{search ? 'Try a different search.' : 'Model tests will appear here once added.'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredModelTests.map((mt: any) => {
                const hasDiscount = mt.discountPrice && mt.regularPrice > mt.discountPrice;
                const displayPrice = mt.discountPrice || mt.allItemsPrice || mt.regularPrice;
                return (
                  <Link key={mt._id || mt.id} href={`/model-tests/${mt._id || mt.id}`}
                    className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md hover:border-purple-100 active:scale-[0.98]">
                    <div className="w-24 h-32 shrink-0 rounded-2xl overflow-hidden relative bg-gray-100 shadow-inner">
                      {mt.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getImageUrl(mt.coverImage) || ''} alt={mt.title} className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596496181871-9681eacf9764?w=300&q=80'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><FlaskConical className="w-10 h-10" /></div>
                      )}
                      <div className="absolute top-2 left-2 bg-purple-600/90 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full text-white shadow-sm">TEST</div>
                    </div>
                    <div className="flex flex-col py-1 justify-between flex-1 min-w-0">
                      <div>
                        <h4 className="font-bold text-gray-900 leading-snug text-sm mb-1 pr-2 line-clamp-2">{mt.title}</h4>
                        <p className="text-xs text-gray-400 mb-2">{mt.category?.name || 'Model Test'} · {mt.items?.length || 0} items</p>
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
                        <button onClick={e => e.preventDefault()}
                          className="w-8 h-8 rounded-full bg-purple-900 text-white flex items-center justify-center shadow-md hover:bg-purple-600 transition-colors">
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
