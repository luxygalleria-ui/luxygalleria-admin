'use client';

import { useState } from 'react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([
    {
      id: 1,
      name: 'Muhammed Shahir',
      email: 'muhammedshahir91@gmail.com',
      phone: '+919072353659',
      status: 'ACTIVE'
    }
  ]);

  const toggleCustomerStatus = (id: number) => {
    setCustomers(customers.map(customer => {
      if (customer.id === id) {
        return {
          ...customer,
          status: customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
        };
      }
      return customer;
    }));
  };

  const getStatusStyle = (status: string) => {
    switch(status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'INACTIVE':
      case 'BLOCKED':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 transition-all duration-300">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[16px] font-medium text-slate-800">Customer Management</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[25%]">Name</th>
                <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[30%]">Email</th>
                <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Phone</th>
                <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[15%]">Status</th>
                <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{customer.name}</td>
                  <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{customer.email}</td>
                  <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{customer.phone}</td>
                  <td className="py-5 px-6">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(customer.status)}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-5 px-6">
                    <button 
                      onClick={() => toggleCustomerStatus(customer.id)}
                      className={`w-[34px] h-[34px] rounded-[8px] flex items-center justify-center transition-colors ${
                        customer.status === 'ACTIVE' 
                          ? 'bg-[#fef2f2] text-[#ef4444] hover:bg-red-100' 
                          : 'bg-[#dcfce7] text-[#16a34a] hover:bg-green-100'
                      }`}
                      title={customer.status === 'ACTIVE' ? 'Block Customer' : 'Unblock Customer'}
                    >
                      {customer.status === 'ACTIVE' ? (
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
      </div>
    </div>
  );
}
