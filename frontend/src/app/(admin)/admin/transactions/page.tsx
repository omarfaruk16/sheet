'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminAxios } from '@/lib/adminAuth';
import toast from 'react-hot-toast';

type AdminTransaction = {
  id: string;
  orderId: string;
  transactionId?: string;
  customerName?: string;
  customerEmail?: string;
  paymentGateway?: string;
  paymentStatus: string;
  amount: number;
  createdAt: string;
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminAxios.get<AdminTransaction[]>('/orders/transactions');
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const stats = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.paymentStatus === 'paid') acc.paid += Number(tx.amount || 0);
        if (tx.paymentStatus === 'failed' || tx.paymentStatus === 'cancelled') acc.failed += Number(tx.amount || 0);
        acc.count += 1;
        return acc;
      },
      { paid: 0, failed: 0, count: 0 }
    );
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500">Transactions</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{stats.count}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500">Paid Volume</p>
          <p className="text-2xl font-black text-green-600 mt-1">{stats.paid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500">Failed/Cancelled Volume</p>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.failed.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Gateway</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No transactions found.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-sm">{tx.orderId}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">{tx.transactionId || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{tx.customerName}</div>
                    <div className="text-xs text-gray-500">{tx.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-700 uppercase">{tx.paymentGateway || '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : tx.paymentStatus === 'failed' || tx.paymentStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {String(tx.paymentStatus || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{Number(tx.amount || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
