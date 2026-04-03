'use client';

import { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import Link from 'next/link';

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  actionHref?: string;
  actionLabel?: string;
}

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  actionHref = '/profile/orders',
  actionLabel = 'View Orders',
}: OrderDetailsModalProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isOpen || !order || dismissed) return null;

  const statusConfig = {
    paid: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Payment Successful' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Payment Failed' },
    cancelled: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Payment Cancelled' },
    pending: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Payment Pending' },
    initiated: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Payment Initiated' },
  };

  const status = order.paymentStatus || 'pending';
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  const isPaid = status === 'paid';
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

  const handleClose = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-lg ${config.bg} rounded-3xl p-8 shadow-2xl border border-gray-200 relative max-h-[90vh] overflow-y-auto`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Status Icon & Title */}
        <div className="text-center mb-6">
          <div className="mx-auto w-fit mb-4">
            <Icon className={`w-12 h-12 ${config.color}`} />
          </div>
          <h2 className={`text-2xl font-black ${config.color}`}>{config.label}</h2>
          <p className="text-sm text-gray-600 mt-1">Order #{order.orderId}</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Order Date:</span>
            <span className="text-sm font-semibold text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-semibold text-gray-900">৳{Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 pt-3">
            <span className="text-sm font-bold text-gray-900">Total Amount:</span>
            <span className="text-lg font-black text-green-600">৳{Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Order Items</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-white rounded-xl p-3 text-sm">
                <p className="font-semibold text-gray-900">{item.productTitle}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">
                    {item.isAllChapters ? 'All Chapters' : `${item.chapters?.length || 0} Chapter(s)`}
                  </p>
                  <p className="font-semibold text-gray-900">৳{Number(item.price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Links (if paid) */}
        {isPaid && order.items?.some((item: any) => item.downloadUrl) && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Downloads</h3>
            <div className="space-y-2">
              {order.items?.map((item: any, idx: number) => (
                item.downloadUrl && (
                  <a
                    key={idx}
                    href={item.downloadUrl}
                    download
                    className="flex items-center gap-2 bg-white p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-900 flex-1">{item.productTitle}</span>
                    <span className="text-xs text-gray-500">PDF</span>
                  </a>
                )
              ))}
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="bg-white rounded-2xl p-4 mb-6">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Transaction Status</p>
          <p className="text-sm font-semibold text-gray-900">{normalizedStatus}</p>
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Payment Method</p>
          <p className="text-sm font-semibold text-gray-900 capitalize">{order.paymentGateway || 'SSLCommerz'}</p>
          {order.transactionId && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold mt-3 mb-1">Transaction ID</p>
              <p className="text-xs font-mono text-gray-700">{order.transactionId}</p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleClose}
            className="py-3 px-4 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Got it
          </button>
          <Link
            href={actionHref}
            className="py-3 px-4 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-black transition-colors text-center"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

