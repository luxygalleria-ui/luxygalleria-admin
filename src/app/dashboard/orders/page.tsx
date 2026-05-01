'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
    variants?: { volume: string; price: number }[];
  };
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchOrders();
  }, []);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/v1/payments/admin/orders`, getAuthHeaders());
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  const activeOrder = orders.find(o => o._id === selectedOrder);

  const getStatusStyle = (status: string) => {
    switch(status.toLowerCase()) {
      case 'delivered':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'pending':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'processing':
        return 'bg-[#e0e7ff] text-[#4f46e5]';
      case 'shipped':
        return 'bg-[#dbeafe] text-[#2563eb]';
      case 'cancelled':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await axios.put(`${API_URL}/v1/payments/admin/orders/${id}/status`, {
        orderStatus: newStatus
      }, getAuthHeaders());
      if (res.data.success) {
        setOrders(orders.map(order => 
          order._id === id ? { ...order, orderStatus: newStatus } : order
        ));
      }
    } catch (err) {
      console.error('Failed to update order status', err);
      alert('Failed to update order status');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto mt-2 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Orders List */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          <div className="mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">All Orders</h2>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg font-medium">No orders yet</p>
              <p className="text-sm mt-2">Orders will appear here once customers place them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[15%]">ID</th>
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[25%]">Customer</th>
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Items</th>
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[15%]">Total</th>
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[15%]">Status</th>
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Date</th>
                    <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[10%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">#{order._id.substring(0, 8)}</td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111827] text-[14px] leading-tight mb-0.5">{order.user?.name || 'Unknown'}</span>
                          <span className="text-slate-500 text-[13px]">{order.user?.email || ''}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-[15px] text-[#111827] font-medium">{order.items.length} items</td>
                      <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">₹{order.total}</td>
                      <td className="py-5 px-6">
                        <div className={`relative inline-block rounded-[6px] ${getStatusStyle(order.orderStatus)}`}>
                          <select 
                            value={order.orderStatus}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="appearance-none pl-3 pr-8 py-1.5 w-full h-full bg-transparent text-inherit text-[12px] font-bold tracking-wide outline-none cursor-pointer"
                          >
                            <option value="processing" className="text-slate-800">Processing</option>
                            <option value="shipped" className="text-slate-800">Shipped</option>
                            <option value="delivered" className="text-slate-800">Delivered</option>
                            <option value="cancelled" className="text-slate-800">Cancelled</option>
                          </select>
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-inherit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-[15px] text-[#111827] font-medium">{formatDate(order.createdAt)}</td>
                      <td className="py-5 px-6">
                        <button 
                          onClick={() => setSelectedOrder(order._id)}
                          className="text-[#3b82f6] hover:text-blue-700 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-blue-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Order Details Form */}
        {activeOrder && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 lg:px-8 py-6 shrink-0">
              <h2 className="text-[22px] font-bold text-[#111827]">Order Details</h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Details */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 space-y-6 form-scrollbar">
              
              {/* Order Information */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Order Information</h3>
                <div className="space-y-2 text-[14px] text-slate-700 font-medium">
                  <p>Order ID: #{activeOrder._id}</p>
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(activeOrder.orderStatus)}`}>
                      {activeOrder.orderStatus}
                    </span>
                  </div>
                  <p>Date: {formatFullDate(activeOrder.createdAt)}</p>
                  <p>Payment: {activeOrder.paymentMethod}</p>
                  <div className="flex items-center gap-2">
                    <span>Payment Status:</span>
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${
                      activeOrder.paymentStatus === 'completed' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fef3c7] text-[#d97706]'
                    }`}>
                      {activeOrder.paymentStatus}
                    </span>
                  </div>
                  {activeOrder.razorpayOrderId && <p>Razorpay ID: {activeOrder.razorpayOrderId}</p>}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Customer Information</h3>
                <div className="space-y-2 text-[14px] text-slate-700 font-medium">
                  <p>Name: {activeOrder.user?.name || 'Unknown'}</p>
                  <p>Email: {activeOrder.user?.email || 'N/A'}</p>
                  {activeOrder.user?.phone && <p>Phone: {activeOrder.user.phone}</p>}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Shipping Address</h3>
                <div className="space-y-1.5 text-[14px] text-slate-700 font-medium">
                  {activeOrder.shippingAddress?.street && <p>{activeOrder.shippingAddress.street}</p>}
                  <p>{activeOrder.shippingAddress?.city}{activeOrder.shippingAddress?.state ? `, ${activeOrder.shippingAddress.state}` : ''}</p>
                  <p>{activeOrder.shippingAddress?.zipCode}{activeOrder.shippingAddress?.country ? `, ${activeOrder.shippingAddress.country}` : ''}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Order Items</h3>
                <div className="space-y-4">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                        {item.product?.images?.[0] ? (
                          <img src={item.product.images[0]} alt={item.product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1">
                        <p className="font-bold text-[#111827] text-[14px] leading-snug">{item.product?.name || 'Product unavailable'}</p>
                        <p className="text-[13px] text-slate-500 font-medium">x{item.quantity}</p>
                        <p className="font-bold text-[#111827] text-[14px] mt-1">₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Price Breakdown</h3>
                <div className="space-y-2 text-[14px] text-slate-700 font-medium">
                  <div className="flex justify-between"><span>Subtotal:</span><span>₹{activeOrder.subtotal}</span></div>
                  {activeOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount:</span><span>-₹{activeOrder.discount}</span></div>
                  )}
                  <div className="flex justify-between"><span>Shipping:</span><span>{activeOrder.shippingFee > 0 ? `₹${activeOrder.shippingFee}` : 'Free'}</span></div>
                </div>
              </div>

            </div>

            {/* Total Footer */}
            <div className="px-6 lg:px-8 py-6 shrink-0 flex items-center justify-between border-t border-slate-100">
              <span className="text-[16px] font-bold text-[#111827]">Total Amount:</span>
              <span className="text-[18px] font-bold text-[#2563eb]">₹{activeOrder.total}</span>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
