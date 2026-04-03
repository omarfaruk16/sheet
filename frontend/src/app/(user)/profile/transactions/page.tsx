'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, ReceiptText, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getAccessToken } from '@/lib/userSession';
import OrderDetailsModal from '@/components/OrderDetailsModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type TransactionRecord = {
  id: string;
  orderId: string;
  transactionId?: string;
  paymentStatus: string;
  amount: number;
  subtotal?: number;
  totalAmount?: number;
  paymentGateway?: string;
  createdAt: string;
  items?: Array<{
    productTitle: string;
    isAllChapters?: boolean;
    chapters?: unknown[];
    price: number;
    downloadUrl?: string;
  }>;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<TransactionRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultHandled, setResultHandled] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.push('/login?redirect=/profile/transactions');
        return;
      }

      try {
          const res = await axios.get<TransactionRecord[]>(`${API_URL}/orders/my/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
          setTransactions(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [router]);

  useEffect(() => {
    if (loading || resultHandled || !transactions.length) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('paymentStatus');
    const orderId = params.get('orderId');
    const tranId = params.get('tranId');
    if (!paymentStatus) return;

    const normalizedStatus = paymentStatus.toLowerCase();
    if (['paid', 'success', 'failed', 'cancelled'].includes(normalizedStatus)) {
      localStorage.removeItem('leafsheets_cart');
    }

    const matched =
      transactions.find((tx) => (orderId && tx.orderId === orderId) || (tranId && tx.transactionId === tranId)) ||
      transactions[0];

    setSelectedOrder(matched);
    setModalOpen(true);
    setResultHandled(true);
  }, [loading, resultHandled, transactions]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.paymentStatus === 'paid') acc.success += 1;
        if (tx.paymentStatus === 'failed' || tx.paymentStatus === 'cancelled') acc.failed += 1;
        acc.total += Number(tx.amount || 0);
        return acc;
      },
      { success: 0, failed: 0, total: 0 }
    );
  }, [transactions]);

  const closePaymentResultModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
    router.replace('/profile/transactions');
  };

  const renderStatus = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          Paid
        </span>
      );
    }

    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <XCircle className="w-4 h-4" />
          Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <Clock className="w-4 h-4" />
        {status === 'cancelled' ? 'Cancelled' : 'Pending'}
      </span>
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
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Transactions</h1>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500">Successful</p>
            <p className="text-2xl font-black text-green-600">{summary.success}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500">Failed/Cancelled</p>
            <p className="text-2xl font-black text-red-600">{summary.failed}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500">Total Attempted</p>
            <p className="text-2xl font-black text-gray-900">{summary.total.toFixed(2)}</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="text-4xl mb-4">💳</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Transactions Yet</h2>
            <p className="text-sm text-gray-600 mb-6">Once you start checkout, transaction records will appear here.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <button
                type="button"
                key={tx.id}
                onClick={() => {
                  setSelectedOrder(tx);
                  setModalOpen(true);
                }}
                className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{tx.orderId}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{tx.transactionId || 'No transaction id'}</p>
                  </div>
                  {renderStatus(tx.paymentStatus)}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-600 inline-flex items-center gap-2">
                    <ReceiptText className="w-4 h-4" />
                    {tx.paymentGateway || 'SSLCommerz'}
                  </span>
                  <span className="font-bold text-gray-900">{Number(tx.amount || 0).toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={modalOpen}
          onClose={closePaymentResultModal}
          actionHref="/profile/orders"
          actionLabel="View Orders"
        />
      )}
    </div>
  );
}