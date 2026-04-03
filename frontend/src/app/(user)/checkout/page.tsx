'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getAccessToken, getActiveUser, getLocalSession } from '@/lib/userSession';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(Boolean(auth.currentUser) || Boolean(getLocalSession()));
      setAuthReady(true);
    };

    syncAuthState();

    const unsubscribe = onAuthStateChanged(auth, () => {
      syncAuthState();
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'leafsheets_user_session') {
        syncAuthState();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('leafsheets_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validItems = parsed.filter((it: any) => it && it.productId);
        if (validItems.length !== parsed.length) {
          localStorage.setItem('leafsheets_cart', JSON.stringify(validItems));
        }
        setItems(validItems);
      } catch (e) {
        setItems([]);
      }
    }
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const serviceFee = 0;
  const total = subtotal;

  const handlePlaceOrder = async () => {
    if (!items.length) {
      return toast.error('Your cart is empty.');
    }
    
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

      const orderData = {
        items: items.map(it => ({
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
        })),
        subtotal,
        serviceFee,
        totalAmount: total,
        customerName: activeUser?.name || activeUser?.email?.split('@')[0] || 'Customer',
        customerEmail: activeUser?.email || '',
        customerPhone: '',
        fulfillmentMethod: 'digital',
        currency: 'BDT',
      };

      const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + '/payments/sslcommerz/init', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const gatewayUrl = res?.data?.gatewayUrl;
      if (!gatewayUrl) {
        throw new Error('Failed to start payment gateway session.');
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
          <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Payment</h1>
        </div>
      </div>

      <div className="px-6 space-y-6">
        
        {/* Total Price Card */}
        <div className="bg-green-500 rounded-3xl p-6 text-white text-center shadow-lg shadow-green-500/30">
          <p className="text-green-100 text-[11px] font-bold uppercase tracking-wider mb-1">Amount to Pay</p>
          <h2 className="text-4xl font-black">৳{total.toFixed(2)}</h2>
          <p className="text-green-200 text-xs mt-1">
            {items.length} item(s)
          </p>
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Secure Payment Gateway</h3>
          <div className="p-4 rounded-2xl border-2 border-green-100 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">SSLCommerz</p>
              <p className="text-xs text-gray-500">You can pay via bKash, Nagad, cards, or internet banking from the gateway.</p>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex gap-4 items-start border-b border-gray-100 pb-4">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-gray-600">1</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Click <span className="font-semibold">Confirm Payment</span>.</p>
              <p className="text-sm text-gray-900 mt-1">You will be redirected to SSLCommerz checkout.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start pt-2 border-b border-gray-100 pb-4">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-600">2</span>
            </div>
            <div className="w-full">
              <p className="text-sm text-gray-600 mb-2">Complete payment from your preferred channel (bKash, Nagad, card, or bank).</p>
              <p className="text-xs text-gray-500">Your order is confirmed only after successful payment verification.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start pt-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-green-600">3</span>
            </div>
            <div className="w-full">
              <p className="text-sm text-gray-600 mb-2">After payment, you will be redirected back automatically.</p>
              <p className="text-xs text-gray-500">You can check order status from your profile page.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Navigation / Complete Order */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handlePlaceOrder}
          disabled={loading || !authReady}
          className="w-full bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-gray-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading || !authReady ? 'Processing...' : (
            <>
              Confirm Payment <CheckCircle className="w-5 h-5 text-white" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
