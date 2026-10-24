'use client';

import { useState, useEffect } from 'react';
import axios from '../../../services/apiClient';

interface Customer {
  _id: string;
  name: string;
  email?: string; // absent in read-only production history
  phone?: string;
  isActive: boolean;
  createdAt: string;
  orderCount?: number; // read-only production history only
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // a failed request must not look like an empty list
  // 'history' = read-only production history (local development only); 'local' = this database
  const [source, setSource] = useState<'history' | 'local'>('history');
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const readOnly = source === 'history';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };
  };

  useEffect(() => {
    fetchCustomers(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const fetchCustomers = async (from: 'history' | 'local' = source) => {
    try {
      setLoadError(false);
      setHistoryError(null);
      setLoading(true);
      if (from === 'history') {
        const all: Customer[] = [];
        for (let page = 1; page <= 20; page++) {
          const res = await axios.get('/dashboard/history/customers', { ...getAuthHeaders(), params: { page, limit: 100 } });
          all.push(...res.data.data.customers);
          if (page >= res.data.data.pagination.pages) break;
        }
        setCustomers(all);
        return;
      }
      const res = await axios.get(`/users/admin/customers`, getAuthHeaders());
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (caught) {
      const err = caught as { response?: { status?: number; data?: { message?: string; errors?: { code?: string }[] } } };
      if (from === 'history' && err.response?.status === 404 && err.response?.data?.errors?.[0]?.code === 'HISTORY_DISABLED') {
        setHistoryEnabled(false); // history not configured: this database is the only source
        setSource('local');
        return;
      }
      console.error('Failed to fetch customers', err);
      setLoadError(true);
      setCustomers([]);
      if (from === 'history') setHistoryError(err.response?.data?.message || 'The read-only history request failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (id: string) => {
    try {
      const res = await axios.put(`/users/admin/customers/${id}/toggle-status`, {}, getAuthHeaders());
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

  const deleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await axios.delete(`/users/admin/customers/${id}`, getAuthHeaders());
      if (res.data.success) {
        setCustomers(customers.filter(customer => customer._id !== id));
        alert('Customer deleted successfully');
      }
    } catch (err: any) {
      console.error('Failed to delete customer', err);
      alert(err.response?.data?.message || 'Failed to delete customer');
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
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <h2 className="text-[16px] font-medium text-slate-800">Customer Management</h2>
          <div className="flex flex-wrap items-center gap-3">
            {historyEnabled && (
              <div className="inline-flex rounded-[10px] border border-slate-200 p-1 text-[13px] font-semibold" role="group" aria-label="Customer data source">
                <button onClick={() => setSource('history')} aria-pressed={source === 'history'} className={`px-3 py-1.5 rounded-[8px] transition-colors ${source === 'history' ? 'bg-[#eff6ff] text-[#2563eb]' : 'text-slate-500 hover:bg-slate-50'}`}>Production history (read-only)</button>
                <button onClick={() => setSource('local')} aria-pressed={source === 'local'} className={`px-3 py-1.5 rounded-[8px] transition-colors ${source === 'local' ? 'bg-[#eff6ff] text-[#2563eb]' : 'text-slate-500 hover:bg-slate-50'}`}>This database</button>
              </div>
            )}
            <span className="text-[13px] text-slate-500 font-medium">{customers.length} customers</span>
          </div>
        </div>
        
        {customers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium">{loadError ? 'Could not load customers (the API request failed).' : 'No customers yet'}</p>
            <p className="text-sm mt-2">{historyError || (loadError ? 'Check that the backend is running.' : 'Customers will appear here once they register.')}</p>
            {loadError && (
              <button onClick={() => fetchCustomers(source)} className="mt-4 px-4 py-2 rounded-[10px] bg-[#eff6ff] text-[#2563eb] text-[14px] font-semibold hover:bg-blue-100 transition-colors">Retry</button>
            )}
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
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{customer.name}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{readOnly ? <span className="text-slate-400 text-[13px]">Hidden · {customer.orderCount ?? 0} orders</span> : customer.email}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{readOnly ? <span className="text-slate-400 text-[13px]">Hidden</span> : customer.phone || '—'}</td>
                    <td className="py-5 px-6 text-[14px] text-slate-500 font-medium">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(customer.isActive)}`}>
                        {customer.isActive ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      {readOnly ? <span className="text-[13px] text-slate-400 font-medium">Read-only</span> : (
                      <div className="flex items-center gap-2">
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
                        <button 
                          onClick={() => deleteCustomer(customer._id, customer.name)}
                          className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 transition-colors"
                          title="Delete Customer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                      )}
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
