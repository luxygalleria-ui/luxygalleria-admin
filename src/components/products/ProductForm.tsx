'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ImagePlus, X } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { getImageUrl } from '@/lib/imageUtils';

export interface CreatedProduct {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  categoryId?: string | { _id: string };
  images?: string[];
  variants?: { offerPrice?: number; price?: number; stock?: number; image?: string }[];
}

interface ProductFormProps {
  /** Called with the product the backend created. */
  onCreated?: (product: CreatedProduct) => void | Promise<void>;
  /** Product being edited; null/undefined = create mode. */
  editing?: CreatedProduct | null;
  /** Called with the product the backend updated. */
  onUpdated?: (product: CreatedProduct) => void;
  onCancelEdit?: () => void;
  /** Collection the product is created in, so it never lands in another collection or the main Shop. */
  collectionFlag: 'isGifting' | 'isNewArrival';
  submitLabel?: string;
}

const inputClass = 'w-full border border-slate-200 rounded-[12px] px-4 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const labelClass = 'block text-[13px] font-semibold text-slate-600 mb-2';
const CUSTOM = '__custom__';

export default function ProductForm({ onCreated, editing, onUpdated, onCancelEdit, collectionFlag, submitLabel = 'Save Product' }: ProductFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get('/categories')
      .then((res) => {
        const active = (res.data.data || []).filter((c: { status: string }) => c.status === 'ACTIVE');
        setCategories(active);
        setCategoryId((prev) => prev || active[0]?._id || CUSTOM);
      })
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Load the product being edited into the form (or clear it when editing ends)
  useEffect(() => {
    const v = editing?.variants?.[0];
    const catId = typeof editing?.categoryId === 'object' ? editing.categoryId._id : editing?.categoryId;
    setName(editing?.name || '');
    setDescription(editing?.description || '');
    setPrice(editing ? String(v?.offerPrice ?? v?.price ?? '') : '');
    setStock(editing ? String(v?.stock ?? 0) : '');
    if (catId) setCategoryId(catId);
    else if (editing?.category) setCategoryId(CUSTOM);
    setCustomCategory(editing && !catId ? editing.category || '' : '');
    setImageFile(null);
    setPreviewUrl(editing?.images?.[0] ? getImageUrl(editing.images[0]) : '');
  }, [editing]);

  // Free the blob URL when the preview changes or the form unmounts
  useEffect(() => () => { if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pickImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // A typed name matching an existing category reuses it instead of creating a near-duplicate
    const typed = customCategory.trim();
    const category = categoryId === CUSTOM
      ? categories.find((c) => c.name.toLowerCase() === typed.toLowerCase()) || (typed ? { _id: '', name: typed } : undefined)
      : categories.find((c) => c._id === categoryId);
    if (!name.trim() || !description.trim() || !category) return toast.error('Name, category and description are required');
    if (!(Number(price) > 0)) return toast.error('Price must be greater than zero');
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) return toast.error('Stock must be a whole number, 0 or more');
    if (!imageFile && !previewUrl) return toast.error('Please add a product image');

    const p = Number(price);
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('category', category.name);
    formData.append('categoryId', category._id);
    const priced = { price: p, offerPrice: p, oldPrice: p, actualPrice: p, stock: Number(stock) };
    // ponytail: price/stock edit only the first variant; edit other sizes on the Products page
    const variants = editing?.variants?.length
      ? editing.variants.map((v, i) => (i === 0 ? { ...v, ...priced } : v))
      : [{ size: 'Standard', volume: 'Standard', flavor: 'Default', weight: 0, ...priced }];
    formData.append('variants', JSON.stringify(variants));
    if (!editing) formData.append(collectionFlag, 'true');
    // A new file replaces the images; otherwise the backend needs the existing ones sent back
    if (imageFile) formData.append('imageFiles', imageFile);
    else editing?.images?.forEach((img) => formData.append('images', img));

    setSaving(true);
    try {
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (editing) {
        const res = await apiClient.put(`/products/${editing._id}`, formData, { headers });
        onUpdated?.(res.data.data);
        toast.success('Product updated');
      } else {
        const res = await apiClient.post('/products', formData, { headers });
        setName('');
        setDescription('');
        setPrice('');
        setStock('');
        clearImage();
        await onCreated?.(res.data.data);
      }
    } catch (err) {
      toast.error((axios.isAxiosError(err) && err.response?.data?.message) || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <span className={labelClass}>Product Image *</span>
        {previewUrl ? (
          <div className="relative w-full">
            <img src={previewUrl} alt="Preview" className="w-full h-48 rounded-[12px] object-cover bg-slate-50 border border-slate-100" />
            <button type="button" onClick={clearImage} aria-label="Remove image" className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickImage(e.dataTransfer.files[0]); }}
            className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed text-center transition-colors ${
              dragging ? 'border-[#2563eb] bg-blue-50/50' : 'border-slate-200 hover:border-[#2563eb]'
            }`}
          >
            <ImagePlus className="text-slate-400" size={28} />
            <span className="text-[13px] text-slate-500">
              <span className="font-medium text-[#2563eb]">Click to upload</span> or drag and drop
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
        )}
      </div>

      <div>
        <label htmlFor="pf-name" className={labelClass}>Product Name *</label>
        <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Oud Royale" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-category" className={labelClass}>Category *</label>
          <select id="pf-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={inputClass}>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
            <option value={CUSTOM}>Custom…</option>
          </select>
          {categoryId === CUSTOM && (
            <input aria-label="Custom category name" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} required placeholder="Type a category" className={`${inputClass} mt-2`} />
          )}
        </div>
        <div>
          <label htmlFor="pf-price" className={labelClass}>Price *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">₹</span>
            <input id="pf-price" type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" className={`${inputClass} pl-8`} />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="pf-stock" className={labelClass}>Stock Quantity *</label>
        <input id="pf-stock" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} required placeholder="0" className={inputClass} />
      </div>

      <div>
        <label htmlFor="pf-description" className={labelClass}>Subtitle / Description *</label>
        <textarea id="pf-description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} placeholder="Short description shown on the product" className={`${inputClass} resize-none`} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] transition-colors shadow-sm"
      >
        {saving ? 'Saving...' : editing ? 'Update Product' : submitLabel}
      </button>
      {editing && (
        <button type="button" onClick={onCancelEdit} disabled={saving} className="text-[14px] font-medium text-slate-500 hover:text-slate-700">
          Cancel editing
        </button>
      )}
    </form>
  );
}
