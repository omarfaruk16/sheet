'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, HeartOff, ShoppingCart, ArrowRight, Loader2, BookOpen, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';

const getImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
  return `${base}${url}`;
};

export interface WishlistItem {
  id: string;
  productId?: string;
  modelTestId?: string;
  itemType: 'product' | 'modelTest';
  title: string;
  cover?: string;
  price: number;
  category?: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('leafsheets_wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch {
        setWishlist([]);
      }
    }
  }, []);

  const persistWishlist = (items: WishlistItem[]) => {
    localStorage.setItem('leafsheets_wishlist', JSON.stringify(items));
    setWishlist(items);
  };

  const removeFromWishlist = (id: string) => {
    const updated = wishlist.filter(item => item.id !== id);
    persistWishlist(updated);
    toast.success('Removed from wishlist');
  };

  const handleBuyNow = (item: WishlistItem) => {
    setBuyingId(item.id);
    const href = item.itemType === 'modelTest'
      ? `/model-tests/${item.modelTestId || item.id}`
      : `/products/${item.productId || item.id}`;
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 bg-white sticky top-0 z-20 shadow-sm mb-2">
        <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">My Wishlist</h1>
          <p className="text-xs text-gray-500">{wishlist.length} item{wishlist.length !== 1 ? 's' : ''} saved</p>
        </div>
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
      </div>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <HeartOff className="w-12 h-12 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your wishlist is empty</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Tap the heart icon on any sheet or model test to save it here for later.
          </p>
          <Link
            href="/"
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-2xl transition-colors shadow-md shadow-green-500/20"
          >
            Browse Sheets
          </Link>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {wishlist.map((item) => {
            const coverSrc = getImageUrl(item.cover);
            const isModelTest = item.itemType === 'modelTest';
            const isBuying = buyingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 p-3 overflow-hidden"
              >
                {/* Cover Image */}
                <div className="w-20 h-28 shrink-0 rounded-2xl overflow-hidden relative bg-gray-100 shadow-inner">
                  {coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverSrc}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      {isModelTest ? <FlaskConical className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />}
                    </div>
                  )}
                  <div
                    className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm ${
                      isModelTest ? 'bg-purple-600/90' : 'bg-green-600/90'
                    }`}
                  >
                    {isModelTest ? 'TEST' : 'PDF'}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">
                    {item.title}
                  </h3>
                  {item.category && (
                    <p className="text-xs text-gray-400 mb-2">{item.category}</p>
                  )}
                  <p className={`text-base font-black ${isModelTest ? 'text-purple-600' : 'text-green-600'}`}>
                    ৳{item.price?.toFixed(2)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {/* Buy Now */}
                  <button
                    onClick={() => handleBuyNow(item)}
                    disabled={isBuying}
                    className={`flex items-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all active:scale-95 disabled:cursor-not-allowed ${
                      isModelTest
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
                        : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20'
                    }`}
                  >
                    {isBuying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        Buy Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove from wishlist"
                  >
                    <HeartOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
