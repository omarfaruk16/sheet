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

    if (['paid', 'failed', 'cancelled'].includes(paymentStatus)) {
      localStorage.removeItem('leafsheets_cart');
    }

    const target = paymentStatus === 'paid' ? '/profile/orders' : '/profile/transactions';
    const targetParams = new URLSearchParams({ paymentStatus });
    if (orderId) targetParams.set('orderId', orderId);
    if (tranId) targetParams.set('tranId', tranId);
    router.replace(`${target}?${targetParams.toString()}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
    </div>
  );
}