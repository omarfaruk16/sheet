'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutResultPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = (params.get('status') || params.get('paymentStatus') || 'failed').toLowerCase();
    const orderId = params.get('orderId');
    const tranId = params.get('tranId');
    const paymentStatus = status === 'success' ? 'paid' : status;

    // Clear cart and buynow only on successful payment
    if (paymentStatus === 'paid') {
      localStorage.removeItem('leafsheets_cart');
      localStorage.removeItem('leafsheets_buynow');
    }

    // IMPORTANT: Do NOT touch the user session here.
    // The session (leafsheets_user_session / Firebase) is preserved across redirects
    // because it lives in localStorage / IndexedDB, not in a cookie that SSLCommerz might clear.
    // We just need to redirect to the right page and let that page read the existing session.

    const targetParams = new URLSearchParams({ paymentStatus });
    if (orderId) targetParams.set('orderId', orderId);
    if (tranId) targetParams.set('tranId', tranId);

    // Small delay to ensure local storage writes complete before navigation
    setTimeout(() => {
      const target = paymentStatus === 'paid' ? '/profile/orders' : '/profile/transactions';
      router.replace(`${target}?${targetParams.toString()}`);
    }, 100);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-green-100 border-t-green-500" />
      <p className="text-sm text-gray-500 font-medium">Processing your payment...</p>
    </div>
  );
}