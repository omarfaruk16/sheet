'use client';

import { useState, useEffect } from 'react';
import { Eye, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAxios } from '@/lib/adminAuth';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await adminAxios.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const completeOrder = async (id: string) => {
    if (true || confirm('Mark this order as completed? This will trigger PDF generation.')) {
      try {
        await adminAxios.put(`/orders/${id}/complete`, {});
        toast.success('Order marked as completed! PDFs are generating.');
        fetchOrders();
      } catch (err) {
        console.error('Failed to complete order:', err);
        toast.error('Failed to complete order');
      }
    }
  };

  const rejectOrder = async (id: string) => {
    if (confirm('Are you sure you want to reject this order?')) {
      try {
        await adminAxios.put(`/orders/${id}/reject`, {});
        toast.success('Order marked as cancelled.');
        fetchOrders();
      } catch (err) {
        toast.error('Failed to reject order');
      }
    }
  };

  const filteredOrders = orders.filter((o: any) =>
    filter === 'all' ? true : o.status === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
              <th className="px-6 py-4">Order ID &amp; Date</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 border-r">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o: any) => (
                <tr key={o._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-gray-900 font-medium">{o.orderId}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{o.customerName}</div>
                    <div className="text-xs text-gray-500">{o.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    ৳{Number(o.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 border-r">
                    {o.status === 'completed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Completed
                      </span>
                    )}
                    {o.status === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </span>
                    )}
                    {o.status === 'cancelled' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" /> Cancelled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex justify-center space-x-2">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {o.status === 'pending' && (
                      <>
                        <button
                          onClick={() => completeOrder(o._id)}
                          className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors border border-transparent hover:border-green-100"
                          title="Mark Completed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectOrder(o._id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Reject Order"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl outline-none max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setSelectedOrder(null)} 
              className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-xl font-bold mb-4 border-b border-gray-100 pb-2">Order Details</h3>
            
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-semibold">Order ID:</span>
                <span>{selectedOrder.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Customer:</span>
                <span>{selectedOrder.customerName} ({selectedOrder.customerEmail})</span>
              </div>
              <div className="flex justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex flex-col justify-between">
                  <span className="font-bold text-gray-900">Payment Method:</span>
                  <span className="uppercase text-green-700 font-bold">{selectedOrder.paymentMethod || 'N/A'}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-bold text-gray-900">Transaction Info:</span>
                  <span className="font-mono text-gray-600 font-bold bg-white px-2 py-1 rounded border border-gray-200 mt-1 mb-1">
                    ID: {selectedOrder.transactionId || 'N/A'}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    Sender: {selectedOrder.customerPhone || 'N/A'}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-3">
                <h4 className="font-bold mb-2">Items:</h4>
                <ul className="space-y-2">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-800">{item.productTitle}</span>
                        <span className="font-bold text-green-700">৳{Number(item.price).toFixed(2)}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.isAllChapters ? 'All Chapters' : `${item.chapters?.length} Chapters`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-gray-100 pt-3 flex flex-col gap-1 items-end">
                <div className="flex justify-between w-48">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>৳{Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-lg font-black text-gray-900 mt-1 pt-1 border-t border-gray-200">
                  <span>Total:</span>
                  <span>৳{Number(selectedOrder.totalAmount).toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
