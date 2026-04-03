'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Download, Clock, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { getAccessToken } from '@/lib/userSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultHandled, setResultHandled] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.push('/login?redirect=/profile/orders');
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  useEffect(() => {
    if (loading || resultHandled || !orders.length) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('paymentStatus');
    const orderId = params.get('orderId');
    const tranId = params.get('tranId');
    if (!paymentStatus) return;

    const matched = orders.find((order) =>
      (orderId && order.orderId === orderId) || (tranId && order.transactionId === tranId)
    ) || orders[0];

    if (matched) {
      setSelectedOrder(matched);
      setModalOpen(true);
    }

    if (paymentStatus === 'paid') {
      localStorage.removeItem('leafsheets_cart');
    }

    setResultHandled(true);
  }, [loading, orders, resultHandled]);

  const closePaymentResultModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
    router.replace('/profile/orders');
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" /> },
      cancelled: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-4 h-4" /> },
      pending: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-4 h-4" /> },
      initiated: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-4 h-4" /> },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <div className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="flex justify-end">
          <Link
            href="/profile/transactions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            View Transactions
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Orders Yet</h2>
            <p className="text-sm text-gray-600 mb-6">You haven't placed any orders yet. Start shopping now!</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-green-100 text-xs font-bold uppercase mb-2">Total Spending</p>
              <h2 className="text-3xl font-black mb-4">
                ৳{orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0).toFixed(2)}
              </h2>
              <p className="text-green-100 text-sm">{orders.length} order(s)</p>
            </div>

            {/* Orders List */}
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-gray-900">Order #{order.orderId}</h3>
                      {getStatusBadge(order.paymentStatus)}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {order.items?.length || 0} item(s)
                    </p>
                    <p className="font-bold text-gray-900">
                      ৳{Number(order.totalAmount).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleViewDetails(order)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                {/* Download Links if paid */}
                {(order.paymentStatus === 'paid' || order.status === 'completed') && order.items?.some((item: any) => item.downloadUrl) && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <div className="space-y-2">
                      {order.items?.map((item: any, idx: number) => (
                        item.downloadUrl && (
                          <a
                            key={idx}
                            href={item.downloadUrl}
                            download
                            className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-semibold transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download {item.productTitle}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={modalOpen}
          onClose={closePaymentResultModal}
          actionHref="/profile/transactions"
          actionLabel="View Transactions"
        />
      )}
    </div>
  );
}

