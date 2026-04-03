'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Heart, Check, ArrowRight, ExternalLink, Lock, Loader2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getLocalSession } from '@/lib/userSession';

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&q=80';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
  return `${base}${url}`;
};

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const fallbackCoverImage = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&q=80';
  const loginHref = `/login?redirect=${encodeURIComponent(`/products/${productId}`)}`;

  const [product, setProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('chapters');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isAddToCartAnimating, setIsAddToCartAnimating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [coverImageSrc, setCoverImageSrc] = useState(fallbackCoverImage);

  // Customization State
  const [showCustomization, setShowCustomization] = useState(false);
  const [customInfo, setCustomInfo] = useState({
    headerName: '',
    headerEmail: '',
    watermarkText: '',
    coverText: '',
  });

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('leafsheets_customPrefs');
    if (saved) {
      try {
        setCustomInfo(JSON.parse(saved));
      } catch (e) {
        // ignore JSON parse errors
      }
    }
  }, []);

  useEffect(() => {
    const localSession = getLocalSession();
    if (localSession?.user) {
      setCurrentUser({
        uid: localSession.user.uid,
        email: localSession.user.email,
        displayName: localSession.user.name,
        authProvider: 'local',
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProd = async () => {
      try {
        if (!productId) return;
        const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + `/products/${productId}`);
        setProduct(res.data);
      } catch (err) {
        toast.error('Product not found');
      }
    };
    fetchProd();
  }, [params.id, productId]);

  // Initialize selected chapters once product loads
  useEffect(() => {
    if (product && product.chapters) {
      setSelectedChapters(product.chapters.map((c: any) => c._id));
      setIsAllSelected(true);
    }
  }, [product]);

  useEffect(() => {
    setCoverImageSrc(getImageUrl(product?.coverImage));
  }, [product?.coverImage]);

  useEffect(() => {
    if (!currentUser) {
      setShowCustomization(false);
    }
  }, [currentUser]);

  const requireAuth = (message: string) => {
    if (currentUser) return true;
    toast.error(message);
    setShowLoginModal(true);
    return false;
  };

  const toggleChapter = (id: string) => {
    if (id === 'all') {
      if (isAllSelected) {
        setIsAllSelected(false);
        setSelectedChapters([]);
      } else {
        setIsAllSelected(true);
        setSelectedChapters(product?.chapters.map((c: any) => c._id) || []);
      }
    } else {
      let newSelected;
      const isSelected = selectedChapters.includes(id);
      if (isSelected) {
        newSelected = selectedChapters.filter(c => c !== id);
      } else {
        newSelected = [...selectedChapters, id];
      }
      setSelectedChapters(newSelected);
      setIsAllSelected(newSelected.length === (product?.chapters?.length || 0));
    }
  };

  // Calculate total based on selection
  const calculateTotal = () => {
    if (!product) return 0;
    if (isAllSelected) {
      // Use discountPrice if set, otherwise allChaptersPrice
      return product.discountPrice || product.allChaptersPrice || 0;
    }
    // Sum individual chapter prices
    return selectedChapters.reduce((total, chId) => {
      const ch = product.chapters.find((c: any) => c._id === chId);
      return total + (ch?.price || 0);
    }, 0);
  };

  // Open demo PDF in new tab
  const handleReadDemo = () => {
    if (!product?.demoPdfUrl) {
      toast.error('No demo available for this product.');
      return;
    }
    window.open(product.demoPdfUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddToCart = () => {
    if (!product || isAddedToCart) return;

    setIsAddToCartAnimating(true);
    const finalPrice = calculateTotal();
    
    // Resolve selected chapters to full objects for the order model
    let resolvedChapters: { name: string; pdfUrl: string; price: number }[] = [];
    if (isAllSelected) {
      resolvedChapters = (product.chapters || []).map((c: any) => ({
        name: c.name,
        pdfUrl: c.pdfUrl,
        price: c.price,
      }));
    } else {
      resolvedChapters = selectedChapters
        .map(chId => product.chapters.find((c: any) => c._id === chId))
        .filter(Boolean)
        .map((c: any) => ({ name: c.name, pdfUrl: c.pdfUrl, price: c.price }));
    }

    const cartItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product._id,
      productTitle: product.title,
      cover: product.coverImage,
      price: finalPrice,
      chapters: resolvedChapters,   // Full objects, not just IDs
      isAllChapters: isAllSelected,
      customization: customInfo,
      // Keeping legacy keys just in case other parts of checkout expect them, mapping to new ones
      headerLeftText: customInfo.headerName,
      headerRightText: customInfo.headerEmail,
      watermarkText: customInfo.watermarkText,
      coverPageText: customInfo.coverText,
    };
    
    // Save to local storage for next time
    localStorage.setItem('leafsheets_customPrefs', JSON.stringify(customInfo));
    
    const existing = JSON.parse(localStorage.getItem('leafsheets_cart') || '[]');
    localStorage.setItem('leafsheets_cart', JSON.stringify([...existing, cartItem]));
    setIsAddedToCart(true);
    toast.success(`${product.title} added to cart successfully`);
    setTimeout(() => setIsAddToCartAnimating(false), 500);
  };

  const handleDetailsTabClick = () => {
    setActiveTab('details');
    if (!currentUser) {
      requireAuth('Please log in to view product details.');
    }
  };

  const handleCustomizeClick = () => {
    if (!requireAuth('Please log in to customize this PDF.')) return;
    setShowCustomization(prev => !prev);
  };

  const handleBuyNow = async () => {
    setIsAddingToCart(true);
    try {
      handleAddToCart();
      router.push('/checkout');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (!product) return <div className="p-10 text-center text-gray-400 animate-pulse">Loading product...</div>;

  // Discount info
  const hasDiscount = product.discountPrice && product.regularPrice > product.discountPrice;
  const discountPct = hasDiscount
    ? Math.round(100 - (product.discountPrice / product.regularPrice) * 100)
    : 0;
  const displayPrice = product.discountPrice || product.allChaptersPrice;
  const isDetailsLocked = activeTab === 'details' && !currentUser;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Details</h1>
        </div>
        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <Heart className="w-6 h-6" />
        </button>
      </div>

      <div className="px-6 pt-6 pb-4 bg-white rounded-b-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        {/* Product Info Main */}
        <div className="flex gap-5">
          <div className="relative w-32 h-44 shrink-0 rounded-2xl overflow-hidden shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageSrc}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={() => setCoverImageSrc(fallbackCoverImage)}
            />
          </div>
          <div className="flex flex-col py-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded-md">Best Seller</span>
              {hasDiscount && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md">
                  -{discountPct}% OFF
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold leading-tight text-gray-900 mb-1 line-clamp-2">{product.title}</h2>
            <p className="text-xs text-gray-500 mb-2">Digital PDF • {product.chapters?.length} Chapters</p>
            
            {/* Price display with discount */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-black text-green-500">৳{displayPrice?.toFixed(2)}</span>
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through">৳{product.regularPrice?.toFixed(2)}</span>
              )}
            </div>
            
            <button 
              onClick={handleAddToCart}
              disabled={isAddedToCart || isAddToCartAnimating}
              className={`mt-auto font-bold py-2.5 px-3 rounded-xl border transition-all text-xs flex items-center justify-center gap-2 active:scale-[0.98] ${
                isAddedToCart
                  ? 'bg-green-500 text-white border-green-500 shadow-sm shadow-green-500/30 cursor-not-allowed'
                  : isAddToCartAnimating
                    ? 'bg-green-100 text-green-700 border-green-200 cursor-wait'
                    : 'bg-gray-50 hover:bg-gray-100 text-green-600 border-gray-100'
              }`}
            >
              {isAddedToCart ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added to Cart
                </>
              ) : isAddToCartAnimating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleReadDemo}
            className={`flex-1 border-2 font-bold py-3 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 ${
              product.demoPdfUrl 
                ? 'border-green-500 text-green-600 hover:bg-green-50' 
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            Read Demo
          </button>
          <button onClick={handleCustomizeClick} className={`flex-1 font-bold py-3 rounded-2xl transition-all text-sm shadow-md flex items-center justify-center gap-2 ${currentUser ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {!currentUser && <Lock className="w-4 h-4" />}
            Customize PDF
          </button>
        </div>
      </div>

      {/* Customization Form */}
      {showCustomization && (
        <div className="px-6 mt-6 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-green-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 opacity-50"></div>
            
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">i</span>
              Personalize your Sheets
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 p-3 bg-green-50/50 border border-green-100 rounded-2xl">
                  <label className="text-[10px] font-bold text-green-600 uppercase">Header Name (Max 15)</label>
                  <input type="text" maxLength={15} placeholder="e.g. Your Name" value={customInfo.headerName} onChange={e => setCustomInfo({...customInfo, headerName: e.target.value})} className="w-full bg-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-400 border border-transparent" />
                </div>
                <div className="space-y-1.5 p-3 bg-green-50/50 border border-green-100 rounded-2xl">
                  <label className="text-[10px] font-bold text-green-600 uppercase">Header Email / Info</label>
                  <input type="text" maxLength={30} placeholder="e.g. you@email.com" value={customInfo.headerEmail} onChange={e => setCustomInfo({...customInfo, headerEmail: e.target.value})} className="w-full bg-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-400 border border-transparent" />
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-orange-50/50 border border-orange-100 border-dashed rounded-2xl">
                <label className="text-[10px] font-bold text-orange-600 uppercase">Unique Watermark Text</label>
                <div className="flex gap-3 items-center">
                  <input type="text" placeholder="e.g. For Personal Use" value={customInfo.watermarkText} onChange={e => setCustomInfo({...customInfo, watermarkText: e.target.value})} className="flex-1 bg-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-400 border border-transparent text-center font-mono opacity-50" />
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                <label className="text-[10px] font-bold text-gray-600 uppercase">Cover Page Special Message</label>
                <textarea rows={2} placeholder="Add a custom dedication or message (optional)" value={customInfo.coverText} onChange={e => setCustomInfo({...customInfo, coverText: e.target.value})} className="w-full bg-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-gray-300 border border-transparent resize-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Chapter Selection */}
      <div className="px-6 mt-6">
        <div className="flex gap-6 border-b-2 border-gray-200 mb-6 px-1">
          <button onClick={() => setActiveTab('chapters')} className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'chapters' ? 'text-green-500' : 'text-gray-400'}`}>
            Chapters List
            {activeTab === 'chapters' && <span className="absolute bottom-[-2px] left-0 w-full h-[3px] bg-green-500 rounded-t-full"></span>}
          </button>
          <button onClick={handleDetailsTabClick} className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-1 ${activeTab === 'details' ? 'text-green-500' : 'text-gray-400'}`}>
            Details
            {!currentUser && <Lock className="w-3 h-3" />}
            {activeTab === 'details' && <span className="absolute bottom-[-2px] left-0 w-full h-[3px] bg-green-500 rounded-t-full"></span>}
          </button>
        </div>

        {activeTab === 'chapters' && (
          <div className="space-y-3 pb-8">
            {/* All Chapters bundle option */}
            <div 
              onClick={() => toggleChapter('all')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isAllSelected ? 'bg-green-50 border-green-500' : 'bg-white border-transparent shadow-sm'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isAllSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {isAllSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isAllSelected ? 'text-green-800' : 'text-gray-900'}`}>All Chapters Bundle</h4>
                  <p className="text-[10px] text-gray-500">Best value - Get the complete book</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold block ${isAllSelected ? 'text-green-600' : 'text-gray-900'}`}>
                  ৳{(product.discountPrice || product.allChaptersPrice).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] text-gray-400 line-through">৳{product.regularPrice?.toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Individual chapters — always visible */}
            <div className="space-y-3">
                {selectedChapters.length === 0 && (
                  <p className="text-xs text-orange-500 font-medium text-center py-1">
                    Select at least one chapter below
                  </p>
                )}
                {product.chapters.map((ch: any) => {
                  const isSelected = selectedChapters.includes(ch._id);
                  return (
                    <div
                      key={ch._id}
                      onClick={() => toggleChapter(ch._id)}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-green-50 border-green-400'
                          : 'bg-white border-transparent shadow-sm hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <h4 className={`text-sm font-medium ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                          {ch.name}
                        </h4>
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                        ৳{ch.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
            </div>
            {/* Helper hint */}
            <p className="text-xs text-gray-400 text-center mt-2">
              {isAllSelected
                ? 'Bundle selected! Tap any chapter to buy individually instead.'
                : `${selectedChapters.length} chapter(s) selected · Tap bundle to switch back`}
            </p>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="relative bg-white p-6 rounded-3xl shadow-sm text-sm text-gray-600 leading-relaxed mb-8 overflow-hidden">
            <div className={isDetailsLocked ? 'blur-sm select-none pointer-events-none' : ''}>
              <p>{product.description}</p>
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {product.tags.map((tag: any) => (
                    <span key={tag._id || tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      #{tag.name || tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isDetailsLocked && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center px-6">
                <div className="text-center max-w-xs">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 mx-auto flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Login Required</h4>
                  <p className="text-xs text-gray-600 mb-4">Sign in to unlock the details for this product.</p>
                  <Link href={loginHref} className="inline-flex items-center justify-center bg-green-500 hover:bg-green-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">
                    Go to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">You need to login first</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Please login to access product details and customization features.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className="py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Not now
              </button>
              <Link
                href={loginHref}
                className="py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold text-center hover:bg-green-400 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Total Price</p>
          <p className="text-2xl font-black text-green-500">৳{calculateTotal().toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isAllSelected ? 'All Chapters' : `${selectedChapters.length} Chapter(s) selected`}
          </p>
        </div>
        
        <button 
          onClick={handleBuyNow}
          disabled={isAddingToCart}
          className="bg-green-500 hover:bg-green-400 disabled:bg-green-300 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Buy Now <ArrowRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
