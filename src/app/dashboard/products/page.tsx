'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from '../../../services/apiClient';
import { getImageUrl, handleImageError } from '../../../lib/imageUtils';

const parseWeightFromVolume = (volume: string): number | null => {
  if (!volume) return null;
  const match = volume.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|liter|liters|litre|litres|ml)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'kg' || unit === 'l' || unit === 'ltr' || unit === 'liter' || unit === 'liters' || unit === 'litre' || unit === 'litres') {
      return value;
    } else if (unit === 'g' || unit === 'gm' || unit === 'gms' || unit === 'ml') {
      return value / 1000;
    }
  }
  return null;
};

// Product type matching backend
interface IVariant {
  _id?: string;
  volume: string;
  size?: string;
  flavor?: string;
  price: number;
  oldPrice?: number;
  offerPrice?: number;
  actualPrice?: number;
  weight?: number;
  stock?: number;
  image?: string;
  sku?: string;
  description?: string;
  name?: string;
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
  stock?: number;
  weight?: number;
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
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [starRating, setStarRating] = useState<number | ''>(5);
  const [reviewsCount, setReviewsCount] = useState<number | ''>(0);
  const [offerText, setOfferText] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [showOnLandingPage, setShowOnLandingPage] = useState(false);
  const [stock, setStock] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [variants, setVariants] = useState<IVariant[]>([{ volume: '50ml', size: '50ml', flavor: 'Default', price: 0, oldPrice: 0, weight: 0, stock: 0, image: '', sku: '', description: '', name: '' }]);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`/products`);
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
      const res = await axios.get(`/categories`);
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
    setStock(0);
    setWeight(0);
    setExistingImages([]);
    setImageFiles([]);
    setPreviewUrls([]);
    setVariants([{ volume: '50ml', size: '50ml', flavor: 'Default', price: 0, oldPrice: 0, weight: 0, stock: 0, image: '', sku: '', description: '', name: '' }]);
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
    setStock(product.stock || 0);
    setWeight(product.weight || 0);
    
    setExistingImages(product.images || []);
    setImageFiles([]);
    setPreviewUrls([]);
    // Provide a deep copy of variants to prevent mutating original state directly
    setVariants(product.variants.map(v => ({
      _id: (v as any)._id || (v as any).id,
      volume: v.volume || v.size || 'Standard',
      size: v.size || v.volume || 'Standard',
      flavor: v.flavor || 'Default',
      price: v.offerPrice || v.price || 0,
      oldPrice: v.actualPrice || v.oldPrice || 0,
      weight: v.weight || 0,
      stock: v.stock || 0,
      image: v.image || '',
      sku: v.sku || '',
      description: v.description || '',
      name: v.name || ''
    })));
    setIsAddProductOpen(true);
  };

  // Handle Add Variant
  const handleAddVariant = () => {
    setVariants([...variants, { volume: '100ml', size: '100ml', flavor: 'Default', price: 0, oldPrice: 0, weight: 0, stock: 0, image: '', sku: '', description: '', name: '' }]);
  };

  const handleVariantChange = (index: number, field: keyof IVariant, value: string | number) => {
    setVariants(prev => {
      const newVariants = [...prev];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return newVariants;
    });
  };

  const handleVariantImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }
    setUploadingVariantIndex(index);
    const formData = new FormData();
    formData.append('imageFile', file);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.data && res.data.success) {
        handleVariantChange(index, 'image', res.data.url);
        toast.success('Variant image uploaded!');
      } else {
        toast.error('Failed to upload variant image');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error uploading image');
    } finally {
      setUploadingVariantIndex(null);
    }
  };

  const handleRemoveVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (existingImages.length + imageFiles.length + newFiles.length > 5) {
        toast.error('You can upload a maximum of 5 images.');
        return;
      }
      setImageFiles(prev => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
    // reset input value so the same file can be selected again if removed
    e.target.value = '';
  };

  const handleDroppedFiles = (files: FileList) => {
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    if (existingImages.length + imageFiles.length + newFiles.length > 5) {
      toast.error('You can upload a maximum of 5 images.');
      return;
    }
    setImageFiles(prev => [...prev, ...newFiles]);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeImageFile = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
    
    const newPreviews = [...previewUrls];
    if (newPreviews[index]) {
      URL.revokeObjectURL(newPreviews[index]); // Free memory
    }
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
  };

  // Handle Submit
  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) return toast.error("Name and description are required.");
    if (!category) return toast.error("Category is required.");
    if (variants.length === 0) return toast.error("At least one variant is required.");

    // Validate duplicates & prices/sizes
    const variantKeys = new Set<string>();
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.volume.trim()) return toast.error(`Variant ${i + 1}: Size/Vol is required.`);
      if (v.price <= 0) return toast.error(`Variant ${i + 1}: Offer Price must be greater than zero.`);
      if (v.oldPrice && v.oldPrice > 0 && v.oldPrice < v.price) {
        return toast.error(`Variant ${i + 1}: Actual Price (₹${v.oldPrice}) cannot be less than Offer Price (₹${v.price}).`);
      }

      const sizeVal = (v.size || v.volume || '').trim().toLowerCase();
      const flavorVal = (v.flavor || 'Default').trim().toLowerCase();
      const key = `${sizeVal}_${flavorVal}`;
      if (variantKeys.has(key)) {
        return toast.error(`Duplicate variant: Size "${v.size || v.volume}" and Flavor "${v.flavor || 'Default'}" already exists.`);
      }
      variantKeys.add(key);
    }

    if (starRating !== '' && (starRating < 0 || starRating > 5)) return toast.error("Star Rating must be between 0 and 5.");
    if (reviewsCount !== '' && reviewsCount < 0) return toast.error("Reviews Count cannot be negative.");

    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    
    // Map variants fully and auto-calculate weights/stock
    const variantsWithWeight = variants.map(v => {
      const sizeVal = v.size || v.volume || 'Standard';
      const flavorVal = v.flavor || 'Default';
      const parsedWeight = parseWeightFromVolume(sizeVal);
      const offerPrice = Number(v.price || 0);
      const actualPrice = Number(v.oldPrice || v.price || 0);
      const weight = Number(v.weight !== undefined && v.weight > 0 ? v.weight : (parsedWeight !== null ? parsedWeight : 0));
      const stockVal = Number(v.stock !== undefined ? v.stock : 0);
      return {
        _id: v._id,
        size: sizeVal,
        volume: sizeVal,
        flavor: flavorVal,
        offerPrice,
        actualPrice,
        price: offerPrice,
        oldPrice: actualPrice,
        weight,
        stock: stockVal,
        image: v.image || '',
        sku: v.sku || '',
        description: v.description || '',
        name: v.name || ''
      };
    });
    formData.append('variants', JSON.stringify(variantsWithWeight));
    formData.append('starRating', String(starRating === '' ? 0 : starRating));
    formData.append('reviewsCount', String(reviewsCount === '' ? 0 : reviewsCount));
    formData.append('offerText', offerText);
    formData.append('keyFeatures', keyFeatures);
    formData.append('showOnLandingPage', String(showOnLandingPage));
    
    // Sum stock across variants
    const totalStock = variantsWithWeight.reduce((acc, curr) => acc + curr.stock, 0);
    formData.append('stock', String(totalStock));
    
    // Set global weight in formData based on the first variant's weight
    if (variantsWithWeight.length > 0) {
      formData.append('weight', String(variantsWithWeight[0].weight));
    }

    // Append existing images
    existingImages.forEach(url => formData.append('images', url));

    // Append newly uploaded files
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        formData.append('imageFiles', file);
      });
    }

    try {
      const url = editingId 
        ? `/products/${editingId}` 
        : `/products`;
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
      const res = await axios.delete(`/products/${deleteModal.productId}`, {
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
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[14%]">Variant (Price)</th>
                  <th className="py-4 px-6 text-[14px] font-semibold text-slate-500 w-[10%]">Stock / Wt</th>
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
                  return (
                  <tr key={product._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <img 
                        src={getImageUrl(
                          product.images && product.images.length > 0 
                            ? product.images[0] 
                            : (product.variants?.find((v: any) => v.image)?.image || "")
                        )} 
                        alt={product.name} 
                        className="w-[50px] h-[50px] rounded-[10px] object-cover bg-slate-100"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    </td>
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827] leading-snug pr-8">{product.name}</td>
                    <td className="py-5 px-6 text-[15px] font-medium text-slate-600">{product.category}</td>
                    <td className="py-5 px-6">
                      {product.variants.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-slate-500 mb-0.5">{product.variants[0].volume}</span>
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
                      <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-medium text-slate-600">Stock: {product.stock || 0}</span>
                        <span className="text-[13px] text-slate-400">
                          Wt: {(() => {
                            const parsed = product.variants?.[0]?.volume ? parseWeightFromVolume(product.variants[0].volume) : null;
                            if ((product.weight === undefined || product.weight === 0 || product.weight > 10) && parsed !== null) {
                              return parsed;
                            }
                            return product.weight || 0;
                          })()}kg
                        </span>
                      </div>
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
                
                {/* Variant List */}
                <div className="space-y-4">
                  {variants.map((v, i) => {
                    const priceError = !!(v.oldPrice && v.oldPrice > 0 && v.oldPrice < v.price);
                    return (
                      <div key={i} className={`bg-slate-50 p-4 rounded-[12px] border ${priceError ? 'border-red-200' : 'border-slate-100'} flex flex-col gap-3`}>
                        <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                          <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Variant #{i + 1}</span>
                          {variants.length > 1 && (
                            <button onClick={() => handleRemoveVariant(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-[6px] text-xs font-semibold flex items-center gap-1 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          {/* 1. Size */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Size</label>
                            <input type="text" placeholder="e.g. 50ml" value={v.size || v.volume || ''} onChange={(e) => {
                              const val = e.target.value;
                              setVariants(prev => {
                                const newVariants = [...prev];
                                newVariants[i] = { ...newVariants[i], size: val, volume: val };
                                return newVariants;
                              });
                            }} className="w-full h-[40px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[13px] transition-all bg-white" />
                          </div>
                          
                          {/* 2. Flavor */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Flavor</label>
                            <input type="text" placeholder="e.g. Dark Chocolate" value={v.flavor || ''} onChange={(e) => handleVariantChange(i, 'flavor', e.target.value)} className="w-full h-[40px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[13px] transition-all bg-white" />
                          </div>

                          {/* 3. Variant Name */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Variant Name (optional)</label>
                            <input type="text" placeholder="Name for this variant" value={v.name || ''} onChange={(e) => handleVariantChange(i, 'name', e.target.value)} className="w-full h-[40px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[13px] transition-all bg-white" />
                          </div>

                          {/* 4. Offer Price */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Offer Price (₹)</label>
                            <input type="number" placeholder="₹ Offer" value={v.price === 0 ? '' : v.price} onChange={(e) => handleVariantChange(i, 'price', Number(e.target.value))} className={`w-full h-[40px] px-3 rounded-[8px] border outline-none text-[13px] transition-all bg-white ${priceError ? 'border-red-400' : 'border-slate-200'}`} />
                          </div>

                          {/* 5. Actual Price */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Actual Price (₹)</label>
                            <input type="number" placeholder="₹ Actual" value={v.oldPrice === undefined || v.oldPrice === 0 ? '' : v.oldPrice} onChange={(e) => handleVariantChange(i, 'oldPrice', Number(e.target.value))} className={`w-full h-[40px] px-3 rounded-[8px] border outline-none text-[13px] transition-all bg-white ${priceError ? 'border-red-400' : 'border-slate-200'}`} />
                          </div>

                          {/* 6. Weight */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                            <input type="number" step="0.001" placeholder="e.g. 0.05" value={v.weight === undefined || v.weight === 0 ? '' : v.weight} onChange={(e) => handleVariantChange(i, 'weight', Number(e.target.value))} className="w-full h-[40px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[13px] transition-all bg-white" />
                          </div>

                          {/* 7. Stock */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stock</label>
                            <input type="number" placeholder="Stock quantity" value={v.stock === undefined || v.stock === 0 ? '' : v.stock} onChange={(e) => handleVariantChange(i, 'stock', Number(e.target.value))} className="w-full h-[40px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[13px] transition-all bg-white" />
                          </div>



                          {/* 9. Variant Description */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Variant Description (optional)</label>
                            <input type="text" placeholder="Description for this variant" value={v.description || ''} onChange={(e) => handleVariantChange(i, 'description', e.target.value)} className="w-full h-[40px] px-3 rounded-[8px] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[13px] transition-all bg-white" />
                          </div>

                          {/* 10. Variant Image */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Variant Image</label>
                            
                            {uploadingVariantIndex === i ? (
                              <div className="flex items-center gap-3 h-[40px] px-3 rounded-[8px] border border-blue-200 bg-blue-50/30 text-blue-600 text-[13px] font-semibold animate-pulse">
                                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Uploading variant image...</span>
                              </div>
                            ) : v.image ? (
                              <div className="flex items-center gap-3">
                                <div className="relative w-[40px] h-[40px] rounded-[8px] overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
                                  <img
                                    src={getImageUrl(v.image)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={handleImageError}
                                  />
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                  <label className="flex items-center justify-center px-3 h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13px] rounded-[8px] border border-slate-200 cursor-pointer transition-all select-none shrink-0">
                                    Replace Image
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleVariantImageUpload(i, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleVariantChange(i, 'image', '')}
                                    className="h-[40px] px-3 bg-red-50 text-red-600 font-semibold text-[13px] rounded-[8px] border border-red-100 hover:bg-red-100 transition-all select-none"
                                  >
                                    Delete Image
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <label className="flex-1 flex items-center justify-center px-4 h-[40px] bg-blue-50 text-blue-600 font-semibold text-[13px] rounded-[8px] border border-dashed border-blue-200 cursor-pointer hover:bg-blue-100 transition-all select-none">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                  Upload Variant Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleVariantImageUpload(i, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>

                          {/* 11. Remove Button */}
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(i)}
                              className="w-full bg-red-50 hover:bg-red-100 text-red-600 h-[40px] rounded-[8px] font-bold text-[13px] flex items-center justify-center gap-2 border border-red-100 transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              Remove Variant
                            </button>
                          )}
                        </div>
                        {priceError && (
                          <span className="text-[12px] font-bold text-red-500 ml-2 animate-in fade-in slide-in-from-top-1">
                            Actual Price cannot be less than Offer Price
                          </span>
                        )}
                      </div>
                    );
                  })}
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
                  <input type="number" max="5" min="0" step="0.1" value={starRating} onChange={e => setStarRating(e.target.value === '' ? '' : Number(e.target.value))} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]" />
                </div>
                <div className="flex-1">
                  <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Reviews Count</label>
                  <input type="number" value={reviewsCount} onChange={e => setReviewsCount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]" />
                </div>
              </div>

              {/* Stock */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[14px] font-bold text-slate-900 mb-2.5">Stock</label>
                  <input type="number" min="0" value={stock} onChange={e => setStock(Number(e.target.value))} className="w-full h-[50px] px-4 rounded-[12px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]" />
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

              {/* Image Upload Component */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-[14px] font-bold text-slate-900">Upload Images (Max 5)</label>
                  <span className="text-[12px] font-medium text-slate-500">{existingImages.length + imageFiles.length}/5 selected</span>
                </div>
                
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleDroppedFiles(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-slate-200 rounded-[12px] p-6 text-center hover:bg-slate-50 transition-colors relative mb-4"
                >
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    disabled={existingImages.length + imageFiles.length >= 5}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <p className="text-[14px] font-medium text-slate-600">
                      {existingImages.length + imageFiles.length >= 5 ? 'Maximum limit reached' : 'Click or drag files here to upload'}
                    </p>
                    <p className="text-[12px] text-slate-400">JPG, PNG, WEBP up to 5MB each</p>
                  </div>
                </div>

                {/* Combined Previews */}
                {(existingImages.length > 0 || previewUrls.length > 0) && (
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {/* Existing Images */}
                    {existingImages.map((url, index) => (
                      <div key={`existing-${index}`} className="relative aspect-square rounded-[8px] overflow-hidden border border-slate-200 group">
                        <img src={getImageUrl(url)} alt={`Existing ${index}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                    {/* New image files */}
                    {previewUrls.map((url, index) => (
                      <div key={`new-${index}`} className="relative aspect-square rounded-[8px] overflow-hidden border border-slate-200 group">
                        <img src={url} alt={`New ${index}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeImageFile(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
