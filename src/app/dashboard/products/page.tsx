'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

// Product type matching backend
interface IVariant {
  volume: string;
  price: number;
  oldPrice?: number;
  stock: number;
}

interface IProduct {
  _id: string;
  name: string;
  category: string;
  description: string;
  variants: IVariant[];
  starRating: number;
  reviewsCount: number;
  offerText?: string;
  keyFeatures?: string;
  images: string[];
  status: string;
  showOnLandingPage?: boolean;
}

export default function ProductsPage() {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [dbCategories, setDbCategories] = useState<{_id: string, name: string, status: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, productId: string | null}>({ isOpen: false, productId: null });
  const [deleting, setDeleting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [starRating, setStarRating] = useState(5);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [offerText, setOfferText] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [showOnLandingPage, setShowOnLandingPage] = useState(false);
  const [imageUrls, setImageUrls] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<IVariant[]>([{ volume: '50ml', price: 0, oldPrice: 0, stock: 10 }]);

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/products`);
      const data = res.data;
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/categories`);
      const data = res.data;
      if (data.success) {
        setDbCategories(data.data);
        const activeCategories = data.data.filter((c: any) => c.status === 'ACTIVE');
        if (activeCategories.length > 0) {
          setCategory(activeCategories[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setName('');
    const activeCategories = dbCategories.filter(c => c.status === 'ACTIVE');
    setCategory(activeCategories.length > 0 ? activeCategories[0].name : '');
    setDescription('');
    setStarRating(5);
    setReviewsCount(0);
    setOfferText('');
    setKeyFeatures('');
    setShowOnLandingPage(false);
    setImageUrls('');
    setImageFiles([]);
    setVariants([{ volume: '50ml', price: 0, oldPrice: 0, stock: 10 }]);
    setIsAddProductOpen(true);
  };

  const handleEdit = (product: IProduct) => {
    setEditingId(product._id);
    setName(product.name);
    setCategory(product.category);
    setDescription(product.description);
    setStarRating(product.starRating);
    setReviewsCount(product.reviewsCount);
    setOfferText(product.offerText || '');
    setKeyFeatures(product.keyFeatures || '');
    setShowOnLandingPage(product.showOnLandingPage || false);
    
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000';
    const fullImageUrls = product.images.map(url => url.startsWith('/uploads/') ? `${baseUrl}${url}` : url);
    setImageUrls(fullImageUrls.join(', '));
    
    setImageFiles([]);
    // Provide a deep copy of variants to prevent mutating original state directly
    setVariants(product.variants.map(v => ({ volume: v.volume, price: v.price, oldPrice: v.oldPrice, stock: v.stock })));
    setIsAddProductOpen(true);
  };

  // Handle Add Variant
  const handleAddVariant = () => {
    setVariants([...variants, { volume: '100ml', price: 0, oldPrice: 0, stock: 0 }]);
  };

  const handleVariantChange = (index: number, field: keyof IVariant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleRemoveVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
  };

  // Handle Submit
  const handleSubmit = async () => {
    if (!name || !description) return toast.error("Name and description are required.");
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('variants', JSON.stringify(variants));
    formData.append('starRating', String(starRating));
    formData.append('reviewsCount', String(reviewsCount));
    formData.append('offerText', offerText);
    formData.append('keyFeatures', keyFeatures);
    formData.append('showOnLandingPage', String(showOnLandingPage));

    // Convert comma separated images to array
    const imagesArray = imageUrls.split(',').map(url => url.trim()).filter(url => url);
    imagesArray.forEach(url => formData.append('images', url));

    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        formData.append('imageFiles', file);
      });
    } else if (imagesArray.length === 0) {
      formData.append('images', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=100&auto=format&fit=crop');
    }

    try {
      const url = editingId 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/products/${editingId}` 
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/products`;
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
        toast.success(editingId ? 'Product updated successfully' : 'Product created successfully');
        setIsAddProductOpen(false);
        setEditingId(null);
        fetchProducts(); // refresh list
      } else {
        toast.error(data.message || 'Failed to save product');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, productId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.productId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/products/${deleteModal.productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        toast.success('Product deleted successfully');
        fetchProducts();
        setDeleteModal({ isOpen: false, productId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting product');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Product Catalog */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 w-full transition-all duration-300 xl:max-h-[calc(100vh-140px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[18px] font-semibold text-slate-800">Product Catalog</h2>
            {!isAddProductOpen ? (
              <button 
                onClick={openAddForm}
                className="bg-[#3b60f6] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[12px] font-medium text-[15px] flex items-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add New Product
              </button>
            ) : (
              <div className="text-sm font-medium text-slate-500">
                {products.length} Products
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 rounded-l-[12px] w-[8%]">Image</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[30%]">Name</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[12%]">Category</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[14%]">Starting Price</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[12%]">Stock</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[10%]">Status</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 rounded-r-[12px] w-[14%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading products...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No products found. Add your first product!</td></tr>
                ) : products.map((product) => {
                  const getImageUrl = (url: string) => {
                    if (!url) return 'https://via.placeholder.com/50';
                    if (url.startsWith('/uploads/')) {
                      // Backend URL is usually something like http://localhost:5000/api, so we remove /api
                      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000';
                      return `${baseUrl}${url}`;
                    }
                    return url;
                  };

                  return (
                  <tr key={product._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <img src={getImageUrl(product.images[0])} alt={product.name} className="w-[50px] h-[50px] rounded-[10px] object-cover bg-slate-100" />
                    </td>
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827] leading-snug pr-8">{product.name}</td>
                    <td className="py-5 px-6 text-[15px] font-medium text-slate-600">{product.category}</td>
                    <td className="py-5 px-6">
                      {product.variants.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold text-[#3b60f6]">₹{product.variants[0].price}</span>
                          {product.variants[0].oldPrice && (
                            <span className="text-[13px] font-medium text-slate-400 line-through">₹{product.variants[0].oldPrice}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-5 px-6">
                      {(() => {
                        const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                        const badgeColor = totalStock === 0
                          ? 'bg-red-50 text-red-600'
                          : totalStock <= 5
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-emerald-50 text-emerald-700';
                        return (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-bold ${badgeColor}`}>
                            {totalStock === 0 ? 'Out of Stock' : `${totalStock} units`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-[15px] font-medium text-slate-600 w-12 block leading-tight">
                        {product.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="w-[38px] h-[38px] rounded-[10px] bg-[#eff6ff] text-[#3b82f6] hover:bg-blue-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onClick={() => handleDeleteClick(product._id)} className="w-[38px] h-[38px] rounded-[10px] bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 flex items-center justify-center transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit Product Form */}
        {isAddProductOpen && (
          <div className="w-full xl:w-[480px] shrink-0 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
              <h2 className="text-[20px] font-bold text-[#111827]">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button 
                onClick={() => { setIsAddProductOpen(false); setEditingId(null); }}
                className="w-[34px] h-[34px] rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 form-scrollbar">
              {/* Product Name */}
              <div>
                <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Product Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Category</label>
                <div className="relative">
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none text-[15px] text-slate-700">
                    {dbCategories.filter(c => c.status === 'ACTIVE').map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                    {dbCategories.filter(c => c.status === 'ACTIVE').length === 0 && (
                      <option value="">No Active Categories</option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              {/* Product Variants */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-[14px] font-bold text-slate-900">Product Variants</label>
                  <button onClick={handleAddVariant} className="bg-[#3b60f6] hover:bg-blue-700 text-white px-3 py-1.5 rounded-[8px] text-[13px] font-semibold flex items-center gap-1.5 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Variant
                  </button>
                </div>
                
                {/* Variant Headers */}
                <div className="flex gap-2 mb-2 px-3">
                  <div className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Size / Vol</div>
                  <div className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Offer Price</div>
                  <div className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actual Price</div>
                  <div className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock</div>
                  {variants.length > 1 && <div className="w-8 shrink-0"></div>}
                </div>

                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-[12px] border border-slate-100">
                      <input type="text" placeholder="e.g. 50ml" value={v.volume} onChange={(e) => handleVariantChange(i, 'volume', e.target.value)} className="flex-1 min-w-0 h-[42px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[14px] transition-all bg-white" />
                      <input type="number" placeholder="₹ Offer" value={v.price === 0 ? '' : v.price} onChange={(e) => handleVariantChange(i, 'price', Number(e.target.value))} className="flex-1 min-w-0 h-[42px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[14px] transition-all bg-white" />
                      <input type="number" placeholder="₹ Actual" value={v.oldPrice === 0 ? '' : v.oldPrice} onChange={(e) => handleVariantChange(i, 'oldPrice', Number(e.target.value))} className="flex-1 min-w-0 h-[42px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[14px] transition-all bg-white" />
                      <input type="number" placeholder="Stock" value={v.stock} onChange={(e) => handleVariantChange(i, 'stock', Number(e.target.value))} className="flex-1 min-w-0 h-[42px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[14px] transition-all bg-white" />
                      {variants.length > 1 && (
                        <button onClick={() => handleRemoveVariant(i)} className="w-8 h-[42px] shrink-0 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-[8px] transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-[120px] p-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-[15px]"></textarea>
              </div>

              {/* Star Rating & Reviews */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Star Rating</label>
                  <input type="number" max="5" min="0" step="0.1" value={starRating} onChange={e => setStarRating(Number(e.target.value))} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]" />
                </div>
                <div className="flex-1">
                  <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Reviews Count</label>
                  <input type="number" value={reviewsCount} onChange={e => setReviewsCount(Number(e.target.value))} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]" />
                </div>
              </div>

              {/* Offer Text & Key Features */}
              <div>
                <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Offer Text (e.g. FLAT 35% OFF)</label>
                <input type="text" value={offerText} onChange={e => setOfferText(e.target.value)} placeholder="Leave empty for default" className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-[15px]" />
              </div>

              <div>
                <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Key Features (Benefits, one per line or comma separated)</label>
                <textarea value={keyFeatures} onChange={e => setKeyFeatures(e.target.value)} placeholder="e.g. Brightens Skin&#10;Reduces dark spots" className="w-full h-[100px] p-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-[15px]"></textarea>
              </div>

              {/* Show on Landing Page */}
              {(() => {
                const currentLandingPageCount = products.filter(p => p.showOnLandingPage && p._id !== editingId).length;
                const limitReached = currentLandingPageCount >= 5 && !showOnLandingPage;
                return (
                  <div className={`flex flex-col gap-1 bg-slate-50 p-4 rounded-[12px] border border-slate-100 ${limitReached ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="showOnLandingPage" 
                        checked={showOnLandingPage}
                        disabled={limitReached}
                        onChange={(e) => setShowOnLandingPage(e.target.checked)} 
                        className={`w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${limitReached ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                      <label htmlFor="showOnLandingPage" className={`text-[14px] font-bold text-slate-900 ${limitReached ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        Show on Landing Page
                      </label>
                    </div>
                    {limitReached && (
                      <span className="text-[12px] font-medium text-red-500 ml-8">Maximum limit of 5 products reached.</span>
                    )}
                  </div>
                );
              })()}

              {/* Image URLs & Files */}
              <div>
                <label className="block text-[13px] font-bold text-slate-900 mb-2.5">Upload Images</label>
                <input type="file" multiple accept="image/*" onChange={e => {
                  if (e.target.files) {
                    setImageFiles(Array.from(e.target.files));
                  }
                }} className="w-full mb-3 text-[14px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                
                <label className="block text-[13px] font-bold text-slate-900 mb-2.5 mt-2">Or provide Image URLs (comma separated)</label>
                <input type="text" value={imageUrls} onChange={e => setImageUrls(e.target.value)} placeholder="https://image1.jpg, https://image2.jpg" className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-[14px]" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-slate-100 bg-white shrink-0">
              <button 
                onClick={handleSubmit}
                disabled={saving}
                className={`w-full ${editingId ? 'bg-[#10b981] hover:bg-emerald-600' : 'bg-[#3b60f6] hover:bg-blue-700'} text-white h-[50px] rounded-[12px] font-bold text-[16px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}
              </button>
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
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Product?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, productId: null })}
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
