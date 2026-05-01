'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/v1/users/admin/customers`, getAuthHeaders());
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (id: string) => {
    try {
      const res = await axios.put(`${API_URL}/v1/users/admin/customers/${id}/toggle-status`, {}, getAuthHeaders());
      if (res.data.success) {
        setCustomers(customers.map(customer => 
          customer._id === id ? { ...customer, isActive: !customer.isActive } : customer
        ));
      }
    } catch (err) {
      console.error('Failed to toggle customer status', err);
      alert('Failed to update customer status');
    }
  };

  const getStatusStyle = (isActive: boolean) => {
    return isActive 
      ? 'bg-[#dcfce7] text-[#16a34a]' 
      : 'bg-[#fee2e2] text-[#dc2626]';
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
      <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 transition-all duration-300">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[16px] font-medium text-slate-800">Customer Management</h2>
          <span className="text-[13px] text-slate-500 font-medium">{customers.length} customers</span>
        </div>
        
        {customers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium">No customers yet</p>
            <p className="text-sm mt-2">Customers will appear here once they register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[25%]">Name</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[30%]">Email</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[15%]">Phone</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Joined</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{customer.name}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{customer.email}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{customer.phone || '—'}</td>
                    <td className="py-5 px-6 text-[14px] text-slate-500 font-medium">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(customer.isActive)}`}>
                        {customer.isActive ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <button 
                        onClick={() => toggleCustomerStatus(customer._id)}
                        className={`w-[34px] h-[34px] rounded-[8px] flex items-center justify-center transition-colors ${
                          customer.isActive 
                            ? 'bg-[#fef2f2] text-[#ef4444] hover:bg-red-100' 
                            : 'bg-[#dcfce7] text-[#16a34a] hover:bg-green-100'
                        }`}
                        title={customer.isActive ? 'Block Customer' : 'Unblock Customer'}
                      >
                        {customer.isActive ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
