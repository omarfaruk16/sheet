'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { auth } from '@/lib/firebase';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('bkash');
  const [trxId, setTrxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState({ bkashNumber: '', nagadNumber: '' });
  
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

    const fetchSettings = async () => {
      try {
        const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + '/settings');
        setAppSettings(res.data);
      } catch (err) {
        console.error('Failed to load settings');
      }
    };
    fetchSettings();
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const serviceFee = parseFloat((subtotal * 0.05).toFixed(2));
  const total = parseFloat((subtotal + serviceFee).toFixed(2));

  const handlePlaceOrder = async () => {
    if (!senderNumber.trim()) return toast.error('Please enter the Sender Number to confirm payment.');
    if (!trxId.trim()) return toast.error('Please enter the Transaction ID to confirm payment.');
    
    if (!auth.currentUser) {
      toast.error('You must be logged in to place an order.');
      router.push('/login');
      return;
    }

    setLoading(true);
    
    try {
      const token = await auth.currentUser.getIdToken();
      const currentUser = auth.currentUser;
      
      const orderData = {
        // 'items' must match the Order model schema (not 'orderItems')
        items: items.map(it => ({
          productId: it.productId,
          productTitle: it.productTitle || 'PDF Sheet',
          // chapters are stored as full objects {name, pdfUrl, price} from product detail page
          chapters: Array.isArray(it.chapters)
            ? it.chapters.filter((c: any) => c && typeof c === 'object' && c.name)
            : [],
          isAllChapters: it.isAllChapters ?? true,
          price: it.price,
          headerLeftText: it.customization?.headerLeft || '',
          headerRightText: it.customization?.headerRight || '',
          watermarkText: it.customization?.watermark || '',
          coverPageText: it.customization?.coverText || '',
        })),
        subtotal,
        serviceFee,
        totalAmount: total,
        customerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
        customerEmail: currentUser.email || '',
        customerPhone: senderNumber.trim(),
        fulfillmentMethod: 'digital',
        paymentMethod: method,
        transactionId: trxId.trim(),
      };

      await axios.post(process.env.NEXT_PUBLIC_API_URL + '/orders', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.removeItem('leafsheets_cart');
      toast.success('Order placed successfully! 🎉');
      router.push('/profile');
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
            {items.length} item(s) · Service fee: ৳{serviceFee.toFixed(2)}
          </p>
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setMethod('bkash')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${method === 'bkash' ? 'border-[#e2136e] bg-[#e2136e]/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div className="w-10 h-10 rounded-full bg-[#e2136e]/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#e2136e]" />
              </div>
              <span className={`text-xs font-bold ${method === 'bkash' ? 'text-[#e2136e]' : 'text-gray-600'}`}>bKash</span>
            </button>
            <button 
              onClick={() => setMethod('nagad')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${method === 'nagad' ? 'border-[#ed1c24] bg-[#ed1c24]/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div className="w-10 h-10 rounded-full bg-[#ed1c24]/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#ed1c24]" />
              </div>
              <span className={`text-xs font-bold ${method === 'nagad' ? 'text-[#ed1c24]' : 'text-gray-600'}`}>Nagad</span>
            </button>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex gap-4 items-start border-b border-gray-100 pb-4">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-gray-600">1</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Send money to this personal number:</p>
              <p className="text-lg font-bold text-gray-900 tracking-wide mt-1">
                {method === 'bkash' ? (appSettings.bkashNumber || 'Not configured') : (appSettings.nagadNumber || 'Not configured')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start pt-2 border-b border-gray-100 pb-4">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-600">2</span>
            </div>
            <div className="w-full">
              <p className="text-sm text-gray-600 mb-2">Enter your Sender Number (the number you sent from):</p>
              <input 
                type="text" 
                placeholder="e.g. 017XXXXXXXX" 
                value={senderNumber}
                onChange={e => setSenderNumber(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
          
          <div className="flex gap-4 items-start pt-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-green-600">3</span>
            </div>
            <div className="w-full">
              <p className="text-sm text-gray-600 mb-2">Enter the Transaction ID below:</p>
              <input 
                type="text" 
                placeholder="e.g. 9F3G7HJ2L" 
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-mono uppercase"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Navigation / Complete Order */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-gray-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? 'Processing...' : (
            <>
              Confirm Payment <CheckCircle className="w-5 h-5 text-white" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
