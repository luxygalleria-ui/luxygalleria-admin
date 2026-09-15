'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import axios from '../services/apiClient';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

interface ICollectionProduct {
  _id: string;
  name: string;
  category?: string;
  images?: string[];
  variants?: { offerPrice?: number; price?: number; image?: string }[];
  isGifting?: boolean;
  isNewArrival?: boolean;
  giftingOrder?: number;
  newArrivalOrder?: number;
}

export interface CollectionManagerProps {
  /** Display name, e.g. "Gifting". */
  label: string;
  /** Storefront path, e.g. "/gifting". */
  storefrontPath: string;
  flag: 'isGifting' | 'isNewArrival';
  orderField: 'giftingOrder' | 'newArrivalOrder';
  /** Backend endpoint that replaces the whole ordered list. */
  saveEndpoint: string;
  titleKey: 'giftingTitle' | 'newArrivalsTitle';
  subtitleKey: 'giftingSubtitle' | 'newArrivalsSubtitle';
  titlePlaceholder: string;
  subtitlePlaceholder: string;
  /** Products carrying this flag belong exclusively elsewhere: hidden from both the list and the Add Products selector. */
  excludeFlag?: 'isGifting' | 'isNewArrival';
  /** Short note shown under "Add Products". */
  addHint?: string;
}

const thumbOf = (p: ICollectionProduct) => getImageUrl(p.images?.[0] || p.variants?.find(v => v.image)?.image || '');
const priceOf = (p: ICollectionProduct) => p.variants?.[0]?.offerPrice ?? p.variants?.[0]?.price ?? 0;

/** Manage one storefront collection: its products, their order, and the page heading. */
export default function CollectionManager({
  label, storefrontPath, flag, orderField, saveEndpoint, titleKey, subtitleKey, titlePlaceholder, subtitlePlaceholder,
  excludeFlag, addHint,
}: CollectionManagerProps) {
  const [products, setProducts] = useState<ICollectionProduct[]>([]);
  // Ordered list of product ids in the collection; savedIds is the last persisted state (for the unsaved-changes check)
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, settingsRes] = await Promise.all([axios.get('/products'), axios.get('/settings')]);
        if (productsRes.data.success) {
          const all: ICollectionProduct[] = productsRes.data.data;
          const ids = all
            .filter(p => p[flag] && !(excludeFlag && p[excludeFlag]))
            .sort((a, b) => (a[orderField] ?? 0) - (b[orderField] ?? 0))
            .map(p => p._id);
          setProducts(all);
          setCollectionIds(ids);
          setSavedIds(ids);
        }
        if (settingsRes.data.success) {
          setTitle(settingsRes.data.data[titleKey] || '');
          setSubtitle(settingsRes.data.data[subtitleKey] || '');
        }
      } catch (err) {
        console.error(`Failed to load ${label} data`, err);
        toast.error(`Failed to load ${label} data`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [flag, orderField, titleKey, subtitleKey, label, excludeFlag]);

  const byId = useMemo(() => new Map(products.map(p => [p._id, p])), [products]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      !collectionIds.includes(p._id) &&
      !(excludeFlag && p[excludeFlag]) &&
      (!q || p.name.toLowerCase().includes(q))
    );
  }, [products, collectionIds, search, excludeFlag]);

  const isDirty = collectionIds.join(',') !== savedIds.join(',');

  const move = (index: number, dir: -1 | 1) => {
    setCollectionIds(ids => {
      const target = index + dir;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveList = async () => {
    setSaving(true);
    try {
      const res = await axios.put(saveEndpoint, { productIds: collectionIds });
      if (res.data.success) {
        setSavedIds(collectionIds);
        toast.success(`${label} products saved`);
      } else {
        toast.error(res.data.message || `Failed to save ${label} products`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to save ${label} products`);
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await axios.put('/settings', { [titleKey]: title.trim(), [subtitleKey]: subtitle.trim() });
      if (res.data.success) toast.success(`${label} page details saved`);
      else toast.error(res.data.message || 'Failed to save details');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save details');
    } finally {
      setSavingDetails(false);
    }
  };

  const inputClass = 'w-full border border-slate-200 rounded-[12px] px-4 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12 flex flex-col gap-6">

      {/* Page details */}
      <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-[16px] font-medium text-slate-800">{label} Page Details</h2>
            <p className="text-[13px] text-slate-500 mt-1">Heading shown at the top of the storefront {storefrontPath} page.</p>
          </div>
          <button
            onClick={saveDetails}
            disabled={loading || savingDetails}
            className="bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] transition-colors shadow-sm"
          >
            {savingDetails ? 'Saving...' : 'Save Details'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={titleKey} className="block text-[13px] font-semibold text-slate-600 mb-2">Title</label>
            <input id={titleKey} value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder} className={inputClass} />
          </div>
          <div>
            <label htmlFor={subtitleKey} className="block text-[13px] font-semibold text-slate-600 mb-2">Subtitle</label>
            <input id={subtitleKey} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder={subtitlePlaceholder} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* Current collection products (ordered) */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h2 className="text-[16px] font-medium text-slate-800">{label} Products ({collectionIds.length})</h2>
              <p className="text-[13px] text-slate-500 mt-1">Shown only on {storefrontPath} (hidden from the main Shop), in this order.</p>
            </div>
            <button
              onClick={saveList}
              disabled={loading || saving || !isDirty}
              className="bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading products...</p>
          ) : collectionIds.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No {label} products yet. Add some from the list.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {collectionIds.map((id, index) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <li key={id} className="flex items-center gap-4 p-3 rounded-[14px] border border-slate-100 hover:bg-slate-50/50">
                    <span className="w-6 text-center text-[13px] font-semibold text-slate-400">{index + 1}</span>
                    <img src={thumbOf(p)} alt={p.name} onError={e => handleImageError(e as any)} className="w-12 h-12 rounded-[10px] object-cover bg-slate-50 border border-slate-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-[12px] text-slate-500">{p.category} · ₹{priceOf(p)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${p.name} up`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30">↑</button>
                      <button onClick={() => move(index, 1)} disabled={index === collectionIds.length - 1} aria-label={`Move ${p.name} down`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30">↓</button>
                      <button onClick={() => setCollectionIds(ids => ids.filter(x => x !== id))} className="ml-2 px-3 h-8 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50">Remove</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Searchable selector of products not yet in the collection */}
        <div className="w-full xl:w-[420px] shrink-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60">
          <h2 className="text-[16px] font-medium text-slate-800 mb-1">Add Products</h2>
          <p className="text-[13px] text-slate-500 mb-4">{addHint || 'Search and add products to this collection.'}</p>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by name"
            aria-label="Search products"
            className={`${inputClass} mb-4`}
          />
          <ul className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
            {!loading && available.length === 0 && (
              <li className="py-6 text-center text-[13px] text-slate-500">No matching products</li>
            )}
            {available.map(p => (
              <li key={p._id} className="flex items-center gap-3 p-2 rounded-[12px] hover:bg-slate-50">
                <img src={thumbOf(p)} alt={p.name} onError={e => handleImageError(e as any)} className="w-10 h-10 rounded-[8px] object-cover bg-slate-50 border border-slate-100 shrink-0" />
                <p className="flex-1 min-w-0 text-[14px] text-slate-700 truncate">{p.name}</p>
                <button
                  onClick={() => setCollectionIds(ids => [...ids, p._id])}
                  className="px-3 h-8 rounded-lg text-[13px] font-medium text-[#2563eb] hover:bg-blue-50 shrink-0"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
