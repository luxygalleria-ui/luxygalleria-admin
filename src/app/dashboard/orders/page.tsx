'use client';

import { useState } from 'react';

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const [orders, setOrders] = useState([
    {
      id: '#69e75b17',
      customerName: 'Muhammed Shahir',
      customerEmail: 'muhammedshahir91@gmail.com',
      items: '1 items',
      total: '₹1,198',
      status: 'Delivered',
      date: '4/21/2026',
      details: {
        orderId: '#69e75b1773cfe91758c1d789',
        fullDate: '4/21/2026, 4:40:15 PM',
        payment: 'razorpay',
        razorpayId: 'order_Sg7Ze11YB1DwR2',
        phone: '+919072353659',
        shipping: {
          address1: 'Kozhikode, Kerala',
          address2: 'ARAKINER, Kerala',
          pin: '673028, India'
        },
        itemsList: [
          {
            name: 'Chemist at Play Exfoliating Body Wash',
            variant: '500ml',
            qty: 2,
            price: '₹599'
          }
        ]
      }
    },
    {
      id: '#69e75d89',
      customerName: 'Muhammed Shahir',
      customerEmail: 'muhammedshahir91@gmail.com',
      items: '1 items',
      total: '₹400',
      status: 'Pending',
      date: '4/21/2026',
      details: {
        orderId: '#69e75d8973cfe91758c1d789',
        fullDate: '4/21/2026, 2:15:00 PM',
        payment: 'razorpay',
        razorpayId: 'order_Tg8Zf12XC2EwS3',
        phone: '+919072353659',
        shipping: {
          address1: 'Kochi, Kerala',
          address2: 'Marine Drive, Kerala',
          pin: '682031, India'
        },
        itemsList: [
          {
            name: 'Deconstruct Brightening Lip Balm with SPF 30',
            variant: '15g',
            qty: 1,
            price: '₹400'
          }
        ]
      }
    }
  ]);

  const activeOrder = orders.find(o => o.id === selectedOrder);

  const getStatusStyle = (status: string) => {
    switch(status.toUpperCase()) {
      case 'DELIVERED':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'PENDING':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'PROCESSING':
        return 'bg-[#e0e7ff] text-[#4f46e5]';
      case 'SHIPPED':
        return 'bg-[#dbeafe] text-[#2563eb]';
      case 'CANCELLED':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setOrders(orders.map(order => 
      order.id === id ? { ...order, status: newStatus } : order
    ));
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Orders List */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          <div className="mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">All Orders</h2>
          </div>
          
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
                  <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{order.id}</td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#111827] text-[14px] leading-tight mb-0.5">{order.customerName}</span>
                        <span className="text-slate-500 text-[13px]">{order.customerEmail}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-[15px] text-[#111827] font-medium">{order.items}</td>
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{order.total}</td>
                    <td className="py-5 px-6">
                      <div className={`relative inline-block rounded-[6px] ${getStatusStyle(order.status)}`}>
                        <select 
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="appearance-none pl-3 pr-8 py-1.5 w-full h-full bg-transparent text-inherit text-[12px] font-bold tracking-wide outline-none cursor-pointer"
                        >
                          <option value="Pending" className="text-slate-800">Pending</option>
                          <option value="Processing" className="text-slate-800">Processing</option>
                          <option value="Shipped" className="text-slate-800">Shipped</option>
                          <option value="Delivered" className="text-slate-800">Delivered</option>
                          <option value="Cancelled" className="text-slate-800">Cancelled</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-inherit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-[15px] text-[#111827] font-medium">{order.date}</td>
                    <td className="py-5 px-6">
                      <button 
                        onClick={() => setSelectedOrder(order.id)}
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
                  <p>Order ID: {activeOrder.details.orderId}</p>
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(activeOrder.status)}`}>
                      {activeOrder.status}
                    </span>
                  </div>
                  <p>Date: {activeOrder.details.fullDate}</p>
                  <p>Payment: {activeOrder.details.payment}</p>
                  <p>Razorpay ID: {activeOrder.details.razorpayId}</p>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Customer Information</h3>
                <div className="space-y-2 text-[14px] text-slate-700 font-medium">
                  <p>Name: {activeOrder.customerName}</p>
                  <p>Email: {activeOrder.customerEmail}</p>
                  <p>Phone: {activeOrder.details.phone}</p>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Shipping Address</h3>
                <div className="space-y-1.5 text-[14px] text-slate-700 font-medium">
                  <p>{activeOrder.details.shipping.address1}</p>
                  <p>{activeOrder.details.shipping.address2}</p>
                  <p>{activeOrder.details.shipping.pin}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-3">Order Items</h3>
                <div className="space-y-4">
                  {activeOrder.details.itemsList.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <p className="font-bold text-[#111827] text-[14px] leading-snug">{item.name}</p>
                      <p className="text-[13px] text-slate-500 font-medium">{item.variant}</p>
                      <p className="text-[13px] text-slate-500 font-medium">x{item.qty}</p>
                      <p className="font-bold text-[#111827] text-[14px] mt-1">{item.price}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Total Footer */}
            <div className="px-6 lg:px-8 py-6 shrink-0 flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#111827]">Total Amount:</span>
              <span className="text-[18px] font-bold text-[#2563eb]">{activeOrder.total}</span>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
