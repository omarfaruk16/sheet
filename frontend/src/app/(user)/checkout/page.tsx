'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, ShieldCheck, FlaskConical, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getAccessToken, getActiveUser, getLocalSession } from '@/lib/userSession';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(Boolean(auth.currentUser) || Boolean(getLocalSession()));
      setAuthReady(true);
    };
    syncAuthState();
    const unsubscribe = onAuthStateChanged(auth, () => syncAuthState());
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'leafsheets_user_session') syncAuthState();
    };
    window.addEventListener('storage', onStorage);
    return () => { unsubscribe(); window.removeEventListener('storage', onStorage); };
  }, []);

  useEffect(() => {
    // ── Priority 1: Buy Now items (single-item checkout from detail page) ──
    const buyNow = localStorage.getItem('leafsheets_buynow');
    if (buyNow) {
      try {
        const parsed = JSON.parse(buyNow);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setIsBuyNow(true);
          return;
        }
      } catch (_) {}
    }

    // ── Priority 2: Regular cart items ──
    const saved = localStorage.getItem('leafsheets_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Accept both product items (have productId) and model test items (have modelTestId)
        const validItems = parsed.filter((it: any) => it && (it.productId || it.modelTestId));
        if (validItems.length !== parsed.length) {
          localStorage.setItem('leafsheets_cart', JSON.stringify(validItems));
        }
        setItems(validItems);
      } catch (_) {
        setItems([]);
      }
    }
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const total = subtotal;

  const handlePlaceOrder = async () => {
    if (!items.length) return toast.error('Your cart is empty.');
    if (!isAuthenticated) {
      toast.error('You must be logged in to place an order.');
      router.push('/login?redirect=/checkout');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Session expired. Please log in again.');
        router.push('/login?redirect=/checkout');
        return;
      }

      const activeUser = getActiveUser();

      // Build order items — support both products and model tests
      const orderItems = items.map(it => {
        const isModelTest = Boolean(it.modelTestId || it.itemType === 'modelTest');
        if (isModelTest) {
          return {
            modelTestId: it.modelTestId,
            productTitle: it.productTitle || 'Model Test',
            modelTestItems: Array.isArray(it.modelTestItems) ? it.modelTestItems : [],
            isAllChapters: it.isAllChapters ?? true,
            price: it.price,
            watermarkText: it.watermarkText || '',
          };
        }
        return {
          productId: it.productId,
          productTitle: it.productTitle || 'PDF Sheet',
          chapters: Array.isArray(it.chapters)
            ? it.chapters.filter((c: any) => c && typeof c === 'object' && c.name)
            : [],
          isAllChapters: it.isAllChapters ?? true,
          price: it.price,
          headerLeftText: it.headerLeftText || it.customization?.headerName || '',
          headerRightText: it.headerRightText || it.customization?.headerEmail || '',
          watermarkText: it.watermarkText || it.customization?.watermarkText || '',
          coverPageText: it.coverPageText || it.customization?.coverText || '',
        };
      });

      const orderData = {
        items: orderItems,
        subtotal,
        serviceFee: 0,
        totalAmount: total,
        customerName: activeUser?.name || activeUser?.email?.split('@')[0] || 'Customer',
        customerEmail: activeUser?.email || '',
        customerPhone: '',
        fulfillmentMethod: 'digital',
        currency: 'BDT',
      };

      const res = await axios.post(
        process.env.NEXT_PUBLIC_API_URL + '/payments/sslcommerz/init',
        orderData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const gatewayUrl = res?.data?.gatewayUrl;
      if (!gatewayUrl) throw new Error('Failed to start payment gateway session.');

      // Clear buy-now key before redirecting (cart stays intact)
      if (isBuyNow) {
        localStorage.removeItem('leafsheets_buynow');
      }

      toast.success('Redirecting to SSLCommerz...');
      window.location.href = gatewayUrl;
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to submit order. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link href={isBuyNow ? '/' : '/cart'} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Payment</h1>
        </div>
        {isBuyNow && (
          <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">Quick Buy</span>
        )}
      </div>

      <div className="px-6 space-y-6">

        {/* Total Price Card */}
        <div className="bg-green-500 rounded-3xl p-6 text-white text-center shadow-lg shadow-green-500/30">
          <p className="text-green-100 text-[11px] font-bold uppercase tracking-wider mb-1">Amount to Pay</p>
          <h2 className="text-4xl font-black">৳{total.toFixed(2)}</h2>
          <p className="text-green-200 text-xs mt-1">{items.length} item(s)</p>
        </div>

        {/* Order Summary */}
        {items.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-700">Order Summary</h3>
            </div>
            <ul className="divide-y divide-gray-50">
              {items.map((it: any, idx: number) => {
                const isModelTest = Boolean(it.modelTestId || it.itemType === 'modelTest');
                return (
                  <li key={idx} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isModelTest
                        ? <FlaskConical className="w-4 h-4 text-purple-500 shrink-0" />
                        : <BookOpen className="w-4 h-4 text-green-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{it.productTitle}</p>
                        <p className="text-[10px] text-gray-400">
                          {isModelTest
                            ? `${it.modelTestItems?.length || 0} test item(s)`
                            : `${it.chapters?.length || 0} chapter(s)`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">৳{it.price?.toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Payment Method */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Secure Payment Gateway</h3>
          <div className="p-4 rounded-2xl border-2 border-green-100 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">SSLCommerz</p>
              <p className="text-xs text-gray-500">Pay via bKash, Nagad, cards, or internet banking.</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          {[
            { n: 1, color: 'gray', text: 'Click Confirm Payment — you will be redirected to SSLCommerz checkout.' },
            { n: 2, color: 'blue', text: 'Complete payment via bKash, Nagad, card, or bank. Order confirmed after successful verification.' },
            { n: 3, color: 'green', text: 'After payment you are redirected back. Check My Library for your downloads.' },
          ].map(({ n, color, text }) => (
            <div key={n} className={`flex gap-4 items-start ${n < 3 ? 'border-b border-gray-100 pb-4' : 'pt-2'}`}>
              <div className={`w-6 h-6 rounded-full bg-${color}-100 flex items-center justify-center shrink-0`}>
                <span className={`text-xs font-bold text-${color}-600`}>{n}</span>
              </div>
              <p className="text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !authReady}
          className="w-full bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-gray-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading || !authReady ? 'Processing...' : (
            <>Confirm Payment <CheckCircle className="w-5 h-5 text-white" /></>
          )}
        </button>
      </div>
    </div>
  );
}
