'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from '../../../services/apiClient';
import { getImageUrl, handleImageError } from '../../../lib/imageUtils';

interface IBrand {
  _id: string;
  name: string;
  logo: string;
  status: string;
  displayOrder: number;
}

export default function BrandsPage() {
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [brands, setBrands] = useState<IBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, brandId: string | null}>({ isOpen: false, brandId: null });
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [displayOrder, setDisplayOrder] = useState(0);

  // Fetch Brands
  const fetchBrands = async () => {
    try {
      const res = await axios.get(`/brands`);
      const data = res.data;
      if (data.success) {
        setBrands(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch brands', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setName('');
    setLogo('');
    setLogoFile(null);
    setPreviewUrl('');
    setStatus('ACTIVE');
    setDisplayOrder(0);
    setIsAddBrandOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setLogoFile(null);
    setPreviewUrl('');
    setLogo('');
  };

  const handleEdit = (brand: IBrand) => {
    setEditingId(brand._id);
    setName(brand.name);
    setLogo(brand.logo || '');
    setLogoFile(null);
    setPreviewUrl(brand.logo ? getImageUrl(brand.logo) : '');
    setStatus(brand.status);
    setDisplayOrder(brand.displayOrder || 0);
    setIsAddBrandOpen(true);
  };

  const handleSubmit = async () => {
    if (!name) return toast.error('Name is required');
    
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('status', status);
    formData.append('displayOrder', displayOrder.toString());
    if (logoFile) {
      formData.append('logoFile', logoFile);
    } else if (logo) {
      formData.append('logo', logo);
    }

    try {
      const url = editingId 
        ? `/brands/${editingId}` 
        : `/brands`;
      const method = editingId ? 'put' : 'post';

      const res = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        data: formData
      });
      
      const data = res.data;
      if (data.success) {
        toast.success(editingId ? 'Brand updated successfully' : 'Brand created successfully');
        setIsAddBrandOpen(false);
        setEditingId(null);
        fetchBrands();
      } else {
        toast.error(data.message || 'Failed to save brand');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, brandId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.brandId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await axios.delete(`/brands/${deleteModal.brandId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        toast.success('Brand deleted successfully');
        fetchBrands();
        setDeleteModal({ isOpen: false, brandId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting brand');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Brand Catalog */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">Product Brands</h2>
            <button 
              onClick={openAddForm}
              className="bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New Brand
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[45%]">Name</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[25%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[30%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading brands...</td></tr>
                ) : brands.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No brands found. Add your first brand!</td></tr>
                ) : brands.map((brand) => (
                  <tr key={brand._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-[48px] h-[48px] rounded-[10px] bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                          {brand.logo ? (
                            <img src={getImageUrl(brand.logo)} alt={brand.name} className="w-full h-full object-contain p-1" onError={(e) => handleImageError(e as any)} />
                          ) : (
                            <span className="text-[20px] font-bold text-slate-300">{brand.name.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[15px] font-bold text-[#111827]">{brand.name}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-bold tracking-wide ${brand.status === 'ACTIVE' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-red-100 text-red-700'}`}>
                        {brand.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEdit(brand)}
                          className="w-[36px] h-[36px] rounded-[10px] bg-[#eff6ff] text-[#3b82f6] hover:bg-blue-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(brand._id)}
                          className="w-[36px] h-[36px] rounded-[10px] bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit Brand Form */}
        {isAddBrandOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col p-6 lg:p-8 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[20px] font-bold text-[#111827]">{editingId ? 'Edit Brand' : 'Add New Brand'}</h2>
              <button 
                onClick={() => { setIsAddBrandOpen(false); setEditingId(null); }}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Brand Name */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Brand Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Brand Logo */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Brand Logo</label>
                {previewUrl ? (
                  <div className="relative w-full h-[120px] rounded-[12px] border border-slate-200 overflow-hidden group bg-slate-50 flex items-center justify-center p-2">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer bg-white text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        Replace
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                      <button type="button" onClick={handleRemoveImage} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-[120px] rounded-[12px] border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <div className="w-[40px] h-[40px] rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-2 shadow-sm transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-blue-500 transition-colors"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <span className="text-[13px] font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Click to upload logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Status</label>
                <div className="relative">
                  <select 
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all appearance-none text-[14px] text-slate-700"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`w-full ${editingId ? 'bg-[#10b981] hover:bg-emerald-600' : 'bg-[#2563eb] hover:bg-blue-700'} text-white h-[48px] rounded-[12px] font-bold text-[15px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Saving...' : (editingId ? 'Update Brand' : 'Create Brand')}
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
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Brand?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this brand? All associated products may be affected.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, brandId: null })}
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
