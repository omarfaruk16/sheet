'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Heart, Check, ArrowRight, ExternalLink, Lock, Loader2, ShoppingCart, FlaskConical, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getLocalSession } from '@/lib/userSession';
import AuthModal from '@/components/AuthModal';

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1596496181871-9681eacf9764?w=400&q=80';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
  return `${base}${url}`;
};

export default function ModelTestDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const modelTestId = params.id as string;
  const fallbackCover = 'https://images.unsplash.com/photo-1596496181871-9681eacf9764?w=400&q=80';

  const [modelTest, setModelTest] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isAddToCartAnimating, setIsAddToCartAnimating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [coverImageSrc, setCoverImageSrc] = useState(fallbackCover);
  const [activeTab, setActiveTab] = useState('items');

  // Watermark only customization
  const [showCustomization, setShowCustomization] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');

  // Wishlist
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('leafsheets_customPrefs');
    if (saved) {
      try { const p = JSON.parse(saved); if (p.watermarkText) setWatermarkText(p.watermarkText); } catch (_) {}
    }
    // Check wishlist
    const wl = JSON.parse(localStorage.getItem('leafsheets_wishlist') || '[]');
    setIsWishlisted(wl.some((w: any) => w.modelTestId === modelTestId || w.id === modelTestId));
  }, [modelTestId]);

  useEffect(() => {
    const localSession = getLocalSession();
    if (localSession?.user) {
      setCurrentUser({ uid: localSession.user.uid, email: localSession.user.email, displayName: localSession.user.name, authProvider: 'local' });
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) setCurrentUser(user); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!modelTestId) return;
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/model-tests/${modelTestId}`)
      .then(res => setModelTest(res.data))
      .catch(() => toast.error('Model test not found'));
  }, [modelTestId]);

  useEffect(() => {
    if (modelTest?.items) {
      setSelectedItems(modelTest.items.map((it: any) => it._id || it.id));
      setIsAllSelected(true);
    }
  }, [modelTest]);

  useEffect(() => { setCoverImageSrc(getImageUrl(modelTest?.coverImage)); }, [modelTest?.coverImage]);
  useEffect(() => { if (!currentUser) setShowCustomization(false); }, [currentUser]);

  const requireAuth = (message: string) => {
    if (currentUser) return true;
    toast.error(message); setShowLoginModal(true); return false;
  };

  const toggleItem = (id: string) => {
    if (id === 'all') {
      if (isAllSelected) { setIsAllSelected(false); setSelectedItems([]); }
      else { setIsAllSelected(true); setSelectedItems(modelTest?.items.map((it: any) => it._id || it.id) || []); }
    } else {
      const isSelected = selectedItems.includes(id);
      const newSelected = isSelected ? selectedItems.filter(i => i !== id) : [...selectedItems, id];
      setSelectedItems(newSelected);
      setIsAllSelected(newSelected.length === (modelTest?.items?.length || 0));
    }
  };

  const calculateTotal = () => {
    if (!modelTest) return 0;
    if (isAllSelected) return modelTest.discountPrice || modelTest.allItemsPrice || 0;
    return selectedItems.reduce((total, itemId) => {
      const it = modelTest.items.find((i: any) => (i._id || i.id) === itemId);
      return total + (it?.price || 0);
    }, 0);
  };

  const handleAddToCart = () => {
    if (!modelTest || isAddedToCart) return;
    if (!requireAuth('Please log in to purchase.')) return;
    if (!watermarkText.trim() || watermarkText.trim().length < 7) {
      setShowCustomization(true);
      toast.error('Watermark name is required (at least 7 characters)');
      // Scroll to customization box
      setTimeout(() => window.scrollBy({ top: 400, behavior: 'smooth' }), 100);
      return;
    }
    
    setIsAddToCartAnimating(true);

    let resolvedItems: any[] = [];
    if (isAllSelected) {
      resolvedItems = (modelTest.items || []).map((it: any) => ({
        name: it.name,
        questionsDocxUrl: it.questionsDocxUrl,
        solutionPdfUrl: it.solutionPdfUrl,
        price: it.price,
        modelTestItemId: it._id || it.id,
      }));
    } else {
      resolvedItems = selectedItems
        .map(itId => modelTest.items.find((it: any) => (it._id || it.id) === itId))
        .filter(Boolean)
        .map((it: any) => ({
          name: it.name,
          questionsDocxUrl: it.questionsDocxUrl,
          solutionPdfUrl: it.solutionPdfUrl,
          price: it.price,
          modelTestItemId: it._id || it.id,
        }));
    }

    const cartItem = {
      id: Math.random().toString(36).substr(2, 9),
      itemType: 'modelTest',
      modelTestId: modelTest._id || modelTest.id,
      productTitle: modelTest.title,
      cover: modelTest.coverImage,
      price: calculateTotal(),
      modelTestItems: resolvedItems,
      isAllChapters: isAllSelected,
      watermarkText,
    };

    // Save watermark preference
    const existing = JSON.parse(localStorage.getItem('leafsheets_customPrefs') || '{}');
    localStorage.setItem('leafsheets_customPrefs', JSON.stringify({ ...existing, watermarkText }));

    const cart = JSON.parse(localStorage.getItem('leafsheets_cart') || '[]');
    localStorage.setItem('leafsheets_cart', JSON.stringify([...cart, cartItem]));
    setIsAddedToCart(true);
    toast.success(`${modelTest.title} added to cart`);
    setTimeout(() => setIsAddToCartAnimating(false), 500);
  };

  const handleBuyNow = async () => {
    if (!modelTest) return;
    if (!requireAuth('Please log in to purchase.')) return;
    
    if (!watermarkText.trim() || watermarkText.trim().length < 7) {
      setShowCustomization(true);
      toast.error('Watermark name is required (at least 7 characters)');
      setTimeout(() => window.scrollBy({ top: 400, behavior: 'smooth' }), 100);
      return;
    }

    setIsAddingToCart(true);
    try {
      let resolvedItems: any[] = [];
      if (isAllSelected) {
        resolvedItems = (modelTest.items || []).map((it: any) => ({
          name: it.name,
          questionsDocxUrl: it.questionsDocxUrl,
          solutionPdfUrl: it.solutionPdfUrl,
          price: it.price,
          modelTestItemId: it._id || it.id,
        }));
      } else {
        resolvedItems = selectedItems
          .map(itId => modelTest.items.find((it: any) => (it._id || it.id) === itId))
          .filter(Boolean)
          .map((it: any) => ({
            name: it.name,
            questionsDocxUrl: it.questionsDocxUrl,
            solutionPdfUrl: it.solutionPdfUrl,
            price: it.price,
            modelTestItemId: it._id || it.id,
          }));
      }
      const buyNowItem = [{
        id: Math.random().toString(36).substr(2, 9),
        itemType: 'modelTest',
        modelTestId: modelTest._id || modelTest.id,
        productTitle: modelTest.title,
        cover: modelTest.coverImage,
        price: calculateTotal(),
        modelTestItems: resolvedItems,
        isAllChapters: isAllSelected,
        watermarkText,
      }];
      // Save watermark preference
      const existing = JSON.parse(localStorage.getItem('leafsheets_customPrefs') || '{}');
      localStorage.setItem('leafsheets_customPrefs', JSON.stringify({ ...existing, watermarkText }));
      // Write buy-now item — checkout will use this instead of the full cart
      localStorage.setItem('leafsheets_buynow', JSON.stringify(buyNowItem));
      router.push('/checkout');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (!modelTest) return <div className="p-10 text-center text-gray-400 animate-pulse">Loading model test...</div>;

  const hasDiscount = modelTest.discountPrice && modelTest.regularPrice > modelTest.discountPrice;
  const discountPct = hasDiscount ? Math.round(100 - (modelTest.discountPrice / modelTest.regularPrice) * 100) : 0;
  const displayPrice = modelTest.discountPrice || modelTest.allItemsPrice;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/model-tests" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Model Test</h1>
        </div>
        <button
          onClick={() => {
            const wl = JSON.parse(localStorage.getItem('leafsheets_wishlist') || '[]');
            if (isWishlisted) {
              const updated = wl.filter((w: any) => w.modelTestId !== modelTestId && w.id !== modelTestId);
              localStorage.setItem('leafsheets_wishlist', JSON.stringify(updated));
              setIsWishlisted(false);
              toast.success('Removed from wishlist');
            } else {
              const newItem = {
                id: modelTestId,
                modelTestId,
                itemType: 'modelTest',
                title: modelTest?.title || '',
                cover: modelTest?.coverImage,
                price: modelTest?.discountPrice || modelTest?.allItemsPrice || modelTest?.regularPrice || 0,
                category: modelTest?.category?.name || '',
              };
              localStorage.setItem('leafsheets_wishlist', JSON.stringify([...wl, newItem]));
              setIsWishlisted(true);
              toast.success('Added to wishlist!');
            }
          }}
          className="p-2 transition-colors"
        >
          <Heart className={`w-6 h-6 transition-colors ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'}`} />
        </button>
      </div>

      <div className="px-6 pt-6 pb-4 bg-white rounded-b-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex gap-5">
          <div className="relative w-32 h-44 shrink-0 rounded-2xl overflow-hidden shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageSrc} alt={modelTest.title} className="w-full h-full object-cover" onError={() => setCoverImageSrc(fallbackCover)} />
            <div className="absolute top-2 left-2 bg-purple-600/90 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full text-white shadow-sm flex items-center gap-1">
              <FlaskConical className="w-3 h-3" /> TEST
            </div>
          </div>
          <div className="flex flex-col py-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-1 rounded-md">Model Test</span>
              {hasDiscount && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md">-{discountPct}% OFF</span>}
            </div>
            <h2 className="text-xl font-bold leading-tight text-gray-900 mb-1 line-clamp-2">{modelTest.title}</h2>
            <p className="text-xs text-gray-500 mb-2">{modelTest.category?.name} • {modelTest.items?.length} Items</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-black text-purple-600">৳{displayPrice?.toFixed(2)}</span>
              {hasDiscount && <span className="text-sm text-gray-400 line-through">৳{modelTest.regularPrice?.toFixed(2)}</span>}
            </div>
            <button onClick={handleAddToCart} disabled={isAddedToCart || isAddToCartAnimating}
              className={`mt-auto font-bold py-2.5 px-3 rounded-xl border transition-all text-xs flex items-center justify-center gap-2 active:scale-[0.98] ${isAddedToCart ? 'bg-purple-500 text-white border-purple-500 shadow-sm cursor-not-allowed' : isAddToCartAnimating ? 'bg-purple-100 text-purple-700 border-purple-200 cursor-wait' : 'bg-gray-50 hover:bg-gray-100 text-purple-600 border-gray-100'}`}>
              {isAddedToCart ? <><Check className="w-3.5 h-3.5" /> Added to Cart</> : isAddToCartAnimating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {modelTest.demoPdfUrl ? (
            <button onClick={() => window.open(modelTest.demoPdfUrl, '_blank')}
              className="flex-1 border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-bold py-3 rounded-2xl transition-all text-sm flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" /> Demo Preview
            </button>
          ) : (
            <button disabled className="flex-1 border-2 border-gray-200 text-gray-400 cursor-not-allowed font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" /> No Demo
            </button>
          )}
          <button onClick={() => { if (!requireAuth('Please log in to customize.')) return; setShowCustomization(prev => !prev); }}
            className={`flex-1 font-bold py-3 rounded-2xl transition-all text-sm shadow-md flex items-center justify-center gap-2 ${currentUser ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {!currentUser && <Lock className="w-4 h-4" />} Customize
          </button>
        </div>
      </div>

      {/* Watermark Customization */}
      {showCustomization && (
        <div className="px-6 mt-6 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-10 opacity-50"></div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">W</span>
              Watermark for Solutions PDF
            </h3>
            <div className="space-y-1.5 p-3 bg-orange-50/50 border border-orange-100 border-dashed rounded-2xl">
              <label className="text-[10px] font-bold text-orange-600 uppercase">Unique Watermark Text (required, min 7 chars)</label>
              <input type="text" placeholder="e.g. For Personal Use Only"
                value={watermarkText}
                onChange={e => setWatermarkText(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-400 border border-transparent text-center font-mono opacity-50" />
              {watermarkText && watermarkText.trim().length < 7 && (
                <p className="text-[10px] text-red-500">⚠ At least 7 characters required ({watermarkText.trim().length}/7)</p>
              )}
              <p className="text-[10px] text-orange-500">This text will be stamped diagonally on all solutions PDF pages</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 mt-6">
        <div className="flex gap-6 border-b-2 border-gray-200 mb-6 px-1">
          <button onClick={() => setActiveTab('items')} className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'items' ? 'text-purple-500' : 'text-gray-400'}`}>
            Test Items
            {activeTab === 'items' && <span className="absolute bottom-[-2px] left-0 w-full h-[3px] bg-purple-500 rounded-t-full"></span>}
          </button>
          <button onClick={() => { setActiveTab('details'); if (!currentUser) requireAuth('Please log in to view details.'); }}
            className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-1 ${activeTab === 'details' ? 'text-purple-500' : 'text-gray-400'}`}>
            Details
            {!currentUser && <Lock className="w-3 h-3" />}
            {activeTab === 'details' && <span className="absolute bottom-[-2px] left-0 w-full h-[3px] bg-purple-500 rounded-t-full"></span>}
          </button>
        </div>

        {activeTab === 'items' && (
          <div className="space-y-3 pb-8">
            {/* All items bundle */}
            <div onClick={() => toggleItem('all')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isAllSelected ? 'bg-purple-50 border-purple-500' : 'bg-white border-transparent shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isAllSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                  {isAllSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isAllSelected ? 'text-purple-800' : 'text-gray-900'}`}>All Items Bundle</h4>
                  <p className="text-[10px] text-gray-500">Best value — Get all test sets</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold block ${isAllSelected ? 'text-purple-600' : 'text-gray-900'}`}>
                  ৳{(modelTest.discountPrice || modelTest.allItemsPrice).toFixed(2)}
                </span>
                {hasDiscount && <span className="text-[10px] text-gray-400 line-through">৳{modelTest.regularPrice?.toFixed(2)}</span>}
              </div>
            </div>

            {/* Individual items */}
            <div className="space-y-3">
              {selectedItems.length === 0 && <p className="text-xs text-orange-500 font-medium text-center py-1">Select at least one item below</p>}
              {modelTest.items.map((it: any) => {
                const isSelected = selectedItems.includes(it._id || it.id);
                return (
                  <div key={it._id || it.id} onClick={() => toggleItem(it._id || it.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-purple-50 border-purple-400' : 'bg-white border-transparent shadow-sm hover:border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <h4 className={`text-sm font-medium ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>{it.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-blue-500 flex items-center gap-0.5"><FileText className="w-3 h-3" /> Q</span>
                          <span className="text-[10px] text-green-500 flex items-center gap-0.5"><FileText className="w-3 h-3" /> A</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>৳{it.price.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              {isAllSelected ? 'Bundle selected! Tap any item to buy individually.' : `${selectedItems.length} item(s) selected`}
            </p>
          </div>
        )}

        {activeTab === 'details' && (
          <div className={`relative bg-white p-6 rounded-3xl shadow-sm text-sm text-gray-600 leading-relaxed mb-8 overflow-hidden`}>
            <div className={!currentUser ? 'blur-sm select-none pointer-events-none' : ''}>
              <p>{modelTest.description}</p>
              <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                <p className="text-xs font-bold text-purple-700 mb-2">What's included per item:</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-blue-700"><FileText className="w-4 h-4" /> Questions (DOCX)</div>
                  <div className="flex items-center gap-1.5 text-xs text-green-700"><FileText className="w-4 h-4" /> Solutions (PDF)</div>
                </div>
              </div>
            </div>
            {!currentUser && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center px-6">
                <div className="text-center max-w-xs">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center mb-3"><Lock className="w-5 h-5" /></div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Login Required</h4>
                  <p className="text-xs text-gray-600 mb-4">Sign in to unlock details.</p>
                  <button onClick={() => setShowLoginModal(true)} className="inline-flex items-center justify-center bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">Sign In</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AuthModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          const localSession = getLocalSession();
          if (localSession?.user) setCurrentUser({ uid: localSession.user.uid, email: localSession.user.email, displayName: localSession.user.name, authProvider: 'local' });
          else if (auth.currentUser) setCurrentUser(auth.currentUser);
        }} />

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Total Price</p>
          <p className="text-2xl font-black text-purple-500">৳{calculateTotal().toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{isAllSelected ? 'All Items' : `${selectedItems.length} item(s) selected`}</p>
        </div>
        <button onClick={handleBuyNow} disabled={isAddingToCart}
          className="bg-purple-500 hover:bg-purple-400 disabled:bg-purple-300 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-purple-500/30 transition-transform active:scale-95 disabled:cursor-not-allowed flex items-center gap-2">
          Buy Now <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
