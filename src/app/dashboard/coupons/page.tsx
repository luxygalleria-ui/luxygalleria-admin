'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ICoupon {
  _id: string;
  code: string;
  discount: string;
  usageLimit?: number;
  minPurchaseAmount?: number;
  applicableProducts: {_id: string, name: string}[];
  expiryDate: string;
  status: string;
}

interface IProduct {
  _id: string;
  name: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, couponId: string | null}>({ isOpen: false, couponId: null });

  // Form State
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/coupons');
      const data = await res.json();
      if (data.success) {
        setCoupons(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch coupons', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  const handleAddClick = () => {
    setEditingId(null);
    setCode('');
    setDiscount('');
    setUsageLimit('');
    setMinPurchaseAmount('');
    setExpiryDate('');
    setStatus('ACTIVE');
    setSelectedProducts([]);
    setIsAddCouponOpen(true);
  };

  const handleEditClick = (coupon: ICoupon) => {
    setEditingId(coupon._id);
    setCode(coupon.code);
    setDiscount(coupon.discount);
    setUsageLimit(coupon.usageLimit ? coupon.usageLimit.toString() : '');
    setMinPurchaseAmount(coupon.minPurchaseAmount ? coupon.minPurchaseAmount.toString() : '');
    setExpiryDate(new Date(coupon.expiryDate).toISOString().split('T')[0]);
    setStatus(coupon.status);
    setSelectedProducts(coupon.applicableProducts.map(p => p._id));
    setIsAddCouponOpen(true);
  };

  const handleClosePanel = () => {
    setIsAddCouponOpen(false);
    setEditingId(null);
  };

  const toggleProductSelection = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleSubmit = async () => {
    if (!code || !discount || !expiryDate) {
      return toast.error('Code, Discount, and Expiry Date are required');
    }
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const couponData = { 
      code, 
      discount, 
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
      expiryDate,
      status,
      applicableProducts: selectedProducts
    };

    try {
      const url = editingId 
        ? `http://localhost:5000/api/v1/coupons/${editingId}` 
        : 'http://localhost:5000/api/v1/coupons';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(couponData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Coupon updated successfully' : 'Coupon created successfully');
        handleClosePanel();
        fetchCoupons();
      } else {
        toast.error(data.message || 'Failed to save coupon');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, couponId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.couponId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`http://localhost:5000/api/v1/coupons/${deleteModal.couponId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Coupon deleted successfully');
        fetchCoupons();
        setDeleteModal({ isOpen: false, couponId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting coupon');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'INACTIVE':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Coupons Catalog */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">Discount Coupons</h2>
            <button 
              onClick={handleAddClick}
              className="bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New Coupon
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[25%]">Code</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Discount</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Expiry</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading coupons...</td></tr>
                ) : coupons.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No coupons found. Add your first coupon!</td></tr>
                ) : coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px] uppercase">{coupon.code}</td>
                    <td className="py-5 px-6 font-medium text-[#111827] text-[15px]">{coupon.discount}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">
                      {new Date(coupon.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(coupon.status)}`}>
                        {coupon.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEditClick(coupon)}
                          className="w-[38px] h-[38px] rounded-[10px] bg-[#eff6ff] text-[#3b82f6] hover:bg-blue-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(coupon._id)}
                          className="w-[38px] h-[38px] rounded-[10px] bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit Coupon Form */}
        {isAddCouponOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 lg:px-8 py-6 shrink-0">
              <h2 className="text-[20px] font-bold text-[#111827]">
                {editingId ? 'Edit Coupon' : 'Add New Coupon'}
              </h2>
              <button 
                onClick={handleClosePanel}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 space-y-6 form-scrollbar">
              {/* Coupon Code */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Coupon Code</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px] uppercase" 
                />
              </div>

              {/* Discount Amount/Percentage */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Discount</label>
                <input 
                  type="text" 
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="e.g. 20% OFF or ₹100 OFF"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Usage Limit (Optional)</label>
                <input 
                  type="number" 
                  value={usageLimit}
                  onChange={e => setUsageLimit(e.target.value)}
                  placeholder="Total uses allowed"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Min Purchase Amount */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Min Purchase Amount (₹) (Optional)</label>
                <input 
                  type="number" 
                  value={minPurchaseAmount}
                  onChange={e => setMinPurchaseAmount(e.target.value)}
                  placeholder="Min order value"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Applicable Products */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Applicable Products (Optional - Select specific products)</label>
                <div className="border border-slate-200 rounded-[12px] p-4 max-h-[160px] overflow-y-auto space-y-3 form-scrollbar bg-[#fcfcfc]">
                  {products.length === 0 ? (
                    <span className="text-sm text-slate-500">No products available.</span>
                  ) : products.map(product => (
                    <label key={product._id} className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedProducts.includes(product._id)}
                        onChange={() => toggleProductSelection(product._id)}
                        className="w-[16px] h-[16px] rounded-[4px] border-slate-300 text-[#2563eb] focus:ring-[#2563eb]" 
                      />
                      <span className="text-[14px] text-slate-700">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Expiry Date</label>
                <input 
                  type="date" 
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px] text-slate-700" 
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px] appearance-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`w-full ${editingId ? 'bg-[#10b981] hover:bg-emerald-600' : 'bg-[#2563eb] hover:bg-blue-700'} text-white h-[48px] rounded-[12px] font-bold text-[15px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Saving...' : (editingId ? 'Update Coupon' : 'Create Coupon')}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 max-w-[400px] w-full shadow-2xl transform transition-all">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Coupon?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this coupon? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, couponId: null })}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 h-[48px] rounded-[14px] font-bold text-[15px] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deleting}
                className={`flex-1 bg-red-500 hover:bg-red-600 text-white h-[48px] rounded-[14px] font-bold text-[15px] transition-colors shadow-sm shadow-red-500/20 ${deleting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
