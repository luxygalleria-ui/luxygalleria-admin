'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Clipboard, Eye, ImagePlus, PackagePlus, RefreshCw, Search, Send, ShieldCheck, Upload, Warehouse } from 'lucide-react';
import { erpService, ErpApiError, type ErpItem, type ErpOrderDetails, type ErpOrderSummary, type ErpPagination } from '@/services/erpService';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';

type TabId = 'orders' | 'items' | 'stock' | 'webhook' | 'images';
type ItemForm = { name: string; description: string; category: string; productImages: string; sku: string; size: string; flavor: string; offerPrice: string; actualPrice: string; stock: string; weight: string; image: string };
const emptyItem: ItemForm = { name: '', description: '', category: '', productImages: '', sku: '', size: '', flavor: 'Default', offerPrice: '', actualPrice: '', stock: '0', weight: '0', image: '' };
const tabs: { id: TabId; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'items', label: 'Items' },
  { id: 'stock', label: 'Stock' },
  { id: 'webhook', label: 'Status webhook' },
  { id: 'images', label: 'Images' },
];
const statusTone: Record<string, string> = {
  processing: 'bg-amber-100 text-amber-800',
  shipped: 'bg-sky-100 text-sky-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function ErpPage() {
  const [tab, setTab] = useState<TabId>('orders');
  const [orders, setOrders] = useState<ErpOrderSummary[]>([]);
  const [orderPagination, setOrderPagination] = useState<ErpPagination | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<ErpOrderDetails | null>(null);
  const [items, setItems] = useState<ErpItem[]>([]);
  const [itemPagination, setItemPagination] = useState<ErpPagination | null>(null);
  const [itemPage, setItemPage] = useState(1);
  const [itemSearch, setItemSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
  const [stockSku, setStockSku] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockReadback, setStockReadback] = useState<number | null>(null);
  const [webhookOrderId, setWebhookOrderId] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('shipped');
  const [erpOrderId, setErpOrderId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const loadOrders = async (page = orderPage, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await erpService.listOrders(page, 25);
      setOrders(response.data);
      setOrderPagination(response.pagination ?? null);
      setOrderPage(page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load ERP orders');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (page = itemPage, search = itemSearch) => {
    setLoading(true);
    setError('');
    try {
      const response = await erpService.listItems(page, 50, search);
      setItems(response.data.items);
      setItemPagination(response.data.pagination);
      setItemPage(page);
      setItemSearch(search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load ERP items');
    } finally {
      setLoading(false);
    }
  };

  const loadInitialOrders = useEffectEvent(() => {
    void loadOrders(1, false);
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) loadInitialOrders();
    });
    return () => { cancelled = true; };
  }, []);

  const refreshCurrent = () => tab === 'orders' ? loadOrders(orderPage) : loadItems(itemPage, itemSearch);

  const showError = (cause: unknown) => {
    const message = cause instanceof Error ? cause.message : 'The ERP request failed';
    setError(message);
    toast.error(message);
  };

  const openOrder = async (orderId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await erpService.getOrder(orderId);
      setSelectedOrder(response.data);
    } catch (cause) {
      showError(cause);
    } finally {
      setLoading(false);
    }
  };

  const editItem = (product: ErpItem, variant: ErpItem['variants'][number]) => {
    if (!variant.sku) {
      toast.error('This variant has no SKU. Assign a unique SKU before editing it through ERP.');
      return;
    }
    setEditingSku(variant.sku);
    setItemForm({
      name: product.name,
      description: product.description,
      category: product.category,
      productImages: product.images.join(', '),
      sku: variant.sku,
      size: variant.size || '',
      flavor: variant.flavor || 'Default',
      offerPrice: String(variant.offerPrice ?? ''),
      actualPrice: String(variant.actualPrice ?? ''),
      stock: String(variant.stock ?? 0),
      weight: String(variant.weight ?? 0),
      image: variant.image || '',
    });
    setTab('items');
  };

  const saveItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const offerPrice = Number(itemForm.offerPrice);
    const actualPrice = Number(itemForm.actualPrice);
    const weight = Number(itemForm.weight);
    const stock = Number(itemForm.stock);
    if (!itemForm.name.trim() || !itemForm.description.trim() || !itemForm.category.trim() || !itemForm.sku.trim()) {
      showError(new Error('Name, description, category, and SKU are required.'));
      return;
    }
    if (!Number.isFinite(offerPrice) || !Number.isFinite(actualPrice) || offerPrice < 0 || actualPrice < offerPrice) {
      showError(new Error('Enter valid prices. Actual price must be at least the offer price.'));
      return;
    }
    if (!editingSku && (!Number.isInteger(stock) || stock < 0)) {
      showError(new Error('Initial stock must be a non-negative whole number.'));
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      showError(new Error('Weight must be a non-negative number in kilograms.'));
      return;
    }
    if (itemForm.image && !itemForm.image.startsWith('https://')) {
      showError(new Error('Variant image must be an HTTPS URL.'));
      return;
    }
    const productImages = itemForm.productImages.split(',').map((url) => url.trim()).filter(Boolean);
    if (productImages.length > 10 || productImages.some((url) => !url.startsWith('https://'))) {
      showError(new Error('Use up to 10 comma-separated HTTPS product image URLs.'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (!editingSku) {
        try {
          await erpService.getItem(itemForm.sku.trim());
          throw new Error(`SKU ${itemForm.sku.trim()} already exists. Select it from the catalogue to edit instead.`);
        } catch (cause) {
          if (!(cause instanceof ErpApiError && cause.status === 404)) throw cause;
        }
      }
      if (editingSku) {
        await erpService.updateItem(editingSku, {
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          category: itemForm.category.trim(),
          size: itemForm.size.trim() || undefined,
          flavor: itemForm.flavor.trim() || undefined,
          offerPrice,
          actualPrice,
          weight,
          imageUrls: productImages,
          image: itemForm.image.trim() || undefined,
        });
        toast.success(`Updated ${editingSku}`);
      } else {
        await erpService.createItem({
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          category: itemForm.category.trim(),
          ...(productImages.length ? { imageUrls: productImages } : {}),
          variants: [{
            sku: itemForm.sku.trim(),
            size: itemForm.size.trim() || 'Standard',
            flavor: itemForm.flavor.trim() || 'Default',
            offerPrice,
            actualPrice,
            stock,
            weight,
            ...(itemForm.image.trim() ? { image: itemForm.image.trim() } : {}),
          }],
        });
        toast.success(`Created ${itemForm.sku.trim()}`);
      }
      setEditingSku(null);
      setItemForm(emptyItem);
      await loadItems(1, itemSearch);
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  };

  const updateStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(stockQuantity);
    if (!stockSku || !Number.isInteger(quantity) || quantity < 0) {
      showError(new Error('Choose a SKU and enter a non-negative whole-number quantity.'));
      return;
    }
    setSaving(true);
    setError('');
    setStockReadback(null);
    try {
      const result = await erpService.updateStock(stockSku, { quantity, asOf: new Date().toISOString() });
      const reread = await erpService.getItem(stockSku);
      if (reread.data.variant.stock !== result.data.quantity) throw new Error('Stock update was accepted but readback did not match the saved quantity.');
      setStockReadback(reread.data.variant.stock);
      await loadItems(1, itemSearch);
      toast.success(`Stock verified for ${stockSku}: ${reread.data.variant.stock}`);
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  };

  const sendWebhook = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[a-f\d]{24}$/i.test(webhookOrderId)) {
      showError(new Error('Enter a valid 24-character order ID.'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const eventId = `erp-admin-${crypto.randomUUID()}`;
      const response = await erpService.sendOrderStatus({
        eventId,
        orderId: webhookOrderId,
        status: webhookStatus,
        occurredAt: new Date().toISOString(),
        ...(erpOrderId.trim() ? { erpOrderId: erpOrderId.trim() } : {}),
        ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
      });
      toast.success(response.message);
      await loadOrders(1);
      if (selectedOrder?.orderId === webhookOrderId) await openOrder(webhookOrderId);
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imageFile) {
      showError(new Error('Choose a JPG, PNG, or WEBP image first.'));
      return;
    }
    if (imageFile.size > 15 * 1024 * 1024) {
      showError(new Error('Image must be 15 MB or smaller.'));
      return;
    }
    setSaving(true);
    setError('');
    setImageUrl('');
    try {
      const response = await erpService.uploadImage(imageFile);
      setImageUrl(response.data.url);
      toast.success('Image uploaded');
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  };

  const allVariants = items.flatMap((product) => product.variants.map((variant) => ({ product, variant })));
  const changeOrderPage = (next: number) => {
    if (next > 0 && next <= (orderPagination?.pages || 1)) void loadOrders(next);
  };
  const changeItemPage = (next: number) => {
    if (next > 0 && next <= (itemPagination?.pages || 1)) void loadItems(next, itemSearch);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-12">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B5E34]">Operations bridge</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">ERP Integration</h2>
          <p className="mt-1 text-sm text-slate-500">Orders, catalogue, stock and fulfilment events</p>
        </div>
        <button onClick={refreshCurrent} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="ERP sections">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => { setTab(item.id); setError(''); if (item.id === 'items' || item.id === 'stock') void loadItems(1, itemSearch); if (item.id === 'orders' || item.id === 'webhook') void loadOrders(orderPage); }} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${tab === item.id ? 'border-[#8B5E34] text-[#704622]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {item.label}
          </button>
        ))}
      </nav>

      {error && <div role="alert" className="flex items-start justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error" className="font-bold">×</button></div>}

      {tab === 'orders' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h3 className="font-semibold text-slate-900">Orders</h3><p className="text-xs text-slate-500">Production order list response and pagination preserved</p></div><span className="text-sm text-slate-500">{orderPagination?.total ?? 0} total</span></div>
            {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading orders…</div> : orders.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No orders found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Details</th></tr></thead><tbody>{orders.map((order) => <tr key={order.orderId} className="border-t border-slate-100"><td className="px-4 py-3 font-mono text-xs">{order.orderId.slice(-8)}</td><td className="px-4 py-3"><div className="font-medium text-slate-900">{order.customer.name || 'Unknown'}</div><div className="text-xs text-slate-500">{order.customer.email || 'No email'}</div></td><td className="px-4 py-3">{order.items.length}</td><td className="px-4 py-3 font-semibold">{order.currency} {order.total.toFixed(2)}</td><td className="px-4 py-3"><span className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone[order.orderStatus] || 'bg-slate-100 text-slate-700'}`}>{order.orderStatus}</span></td><td className="px-4 py-3"><button onClick={() => void openOrder(order.orderId)} title="View order details" className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"><Eye size={16} /></button></td></tr>)}</tbody></table></div>}
            <Pagination page={orderPage} pagination={orderPagination} onChange={changeOrderPage} />
          </section>
          <section className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold text-slate-900">Order details</h3></div>
            {!selectedOrder ? <div className="p-8 text-sm text-slate-500">Select an order to load its complete record.</div> : <div className="max-h-[720px] space-y-5 overflow-y-auto p-5 text-sm">
              <div><p className="font-mono text-xs text-slate-500">{selectedOrder.orderId}</p><p className="mt-1 font-semibold text-slate-900">{selectedOrder.customer.name || 'Unknown customer'}</p><p className="text-slate-600">{selectedOrder.customer.email || 'No email'} · {selectedOrder.customer.phone || 'No phone'}</p></div>
              <div className="grid grid-cols-2 gap-3"><Detail label="Order status" value={selectedOrder.orderStatus} /><Detail label="Payment" value={`${selectedOrder.payment.method} · ${selectedOrder.payment.status}`} /><Detail label="Created" value={new Date(selectedOrder.createdAt).toLocaleString()} /><Detail label="Updated" value={new Date(selectedOrder.updatedAt).toLocaleString()} /></div>
              <div><h4 className="mb-2 font-semibold text-slate-900">Ship to</h4><p className="text-slate-600">{selectedOrder.shippingAddress.street}<br />{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}<br />{selectedOrder.shippingAddress.country}</p></div>
              <div><h4 className="mb-2 font-semibold text-slate-900">Line items</h4><div className="space-y-2">{selectedOrder.items.map((line) => <div key={line.variantId} className="flex justify-between gap-3 border-b border-slate-100 pb-2"><div><p className="font-medium text-slate-800">{line.name || 'Unavailable product'}</p><p className="text-xs text-slate-500">{line.sku || 'SKU not assigned'} · {line.size || 'Standard'} · ×{line.quantity}</p></div><span className="whitespace-nowrap font-semibold">{selectedOrder.currency} {line.lineTotal.toFixed(2)}</span></div>)}</div></div>
              <div className="space-y-1 border-t border-slate-200 pt-3 text-slate-600"><Detail label="Subtotal" value={`${selectedOrder.currency} ${selectedOrder.subtotal.toFixed(2)}`} /><Detail label="Discount" value={`${selectedOrder.currency} ${selectedOrder.discount.toFixed(2)}`} /><Detail label="Shipping" value={`${selectedOrder.currency} ${selectedOrder.shippingFee.toFixed(2)}`} /><Detail label="Total" value={`${selectedOrder.currency} ${selectedOrder.total.toFixed(2)}`} /></div>
            </div>}
          </section>
        </div>
      )}

      {tab === 'items' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-900">Product and variant catalogue</h3><p className="text-xs text-slate-500">SKU is stored on variants; missing SKUs cannot be targeted by ERP updates.</p></div><form onSubmit={(event) => { event.preventDefault(); void loadItems(1, searchInput); }} className="flex gap-2"><label className="relative"><span className="sr-only">Search products or SKUs</span><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Product or SKU" className="h-9 w-48 rounded border border-slate-300 pl-8 pr-2 text-sm" /></label><button className="h-9 rounded bg-slate-900 px-3 text-sm font-semibold text-white">Search</button></form></div>
            {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading catalogue…</div> : allVariants.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No products or variants found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[770px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Item / SKU</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Offer / actual</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{allVariants.map(({ product, variant }) => <tr key={variant.variantId} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-medium text-slate-900">{variant.name || product.name}</div><div className="font-mono text-xs text-slate-500">{variant.sku || 'SKU missing'} · {variant.size || 'Standard'} · {variant.flavor || 'Default'}</div></td><td className="px-4 py-3 text-slate-600">{product.category}</td><td className="px-4 py-3">{variant.offerPrice.toFixed(2)} / {variant.actualPrice?.toFixed(2) ?? '—'}</td><td className="px-4 py-3 font-semibold">{variant.stock}</td><td className="px-4 py-3">{variant.weight} kg</td><td className="px-4 py-3"><button disabled={!variant.sku} onClick={() => editItem(product, variant)} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Edit</button></td></tr>)}</tbody></table></div>}
            <Pagination page={itemPage} pagination={itemPagination} onChange={changeItemPage} />
          </section>
          <form onSubmit={saveItem} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">{editingSku ? `Edit ${editingSku}` : 'Add item'}</h3>{editingSku && <button type="button" onClick={() => { setEditingSku(null); setItemForm(emptyItem); }} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Cancel edit</button>}</div>
            <Field label="Product name"><input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="field" /></Field>
            <Field label="Description"><textarea required rows={3} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="field resize-y" /></Field>
            <Field label="Category name or ID"><input required value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} className="field" /></Field>
            <Field label="Product image URLs (comma-separated HTTPS)"><textarea rows={2} value={itemForm.productImages} onChange={(e) => setItemForm({ ...itemForm, productImages: e.target.value })} className="field resize-y" placeholder="https://cdn.example.com/product.jpg" /></Field>
            {!editingSku && <Field label="Variant SKU"><input required value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} className="field font-mono" /></Field>}
            {editingSku && <Field label="Variant SKU"><input readOnly value={itemForm.sku} className="field bg-slate-50 font-mono text-slate-500" /></Field>}
            <div className="grid grid-cols-2 gap-3"><Field label="Size"><input value={itemForm.size} onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })} className="field" /></Field><Field label="Flavor"><input value={itemForm.flavor} onChange={(e) => setItemForm({ ...itemForm, flavor: e.target.value })} className="field" /></Field></div>
            <div className="grid grid-cols-2 gap-3"><Field label="Offer price"><input required type="number" min="0" step="0.01" value={itemForm.offerPrice} onChange={(e) => setItemForm({ ...itemForm, offerPrice: e.target.value })} className="field" /></Field><Field label="Actual price"><input required type="number" min="0" step="0.01" value={itemForm.actualPrice} onChange={(e) => setItemForm({ ...itemForm, actualPrice: e.target.value })} className="field" /></Field></div>
            <div className="grid grid-cols-2 gap-3">{!editingSku && <Field label="Initial stock"><input required type="number" min="0" step="1" value={itemForm.stock} onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })} className="field" /></Field>}<Field label="Weight (kg)"><input type="number" min="0" step="0.001" value={itemForm.weight} onChange={(e) => setItemForm({ ...itemForm, weight: e.target.value })} className="field" /></Field></div>
            <Field label="Variant image URL (HTTPS)"><input type="url" value={itemForm.image} onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })} className="field" placeholder="https://…" /></Field>
            {editingSku && <p className="text-xs text-slate-500">Stock is managed separately in the Stock tab.</p>}
            <button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#8B5E34] px-4 text-sm font-semibold text-white hover:bg-[#704622] disabled:opacity-50"><PackagePlus size={16} />{saving ? 'Saving…' : editingSku ? 'Save item changes' : 'Create item'}</button>
          </form>
        </div>
      )}

      {tab === 'stock' && (
        <section className="max-w-2xl rounded-md border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-100 text-emerald-800"><Warehouse size={20} /></div><div><h3 className="font-semibold text-slate-900">Variant stock update</h3><p className="text-sm text-slate-500">Absolute sellable quantity; SKU is the variant identifier.</p></div></div>
          {loading && <p className="mb-3 text-sm text-slate-500">Loading SKU records…</p>}
          <form onSubmit={updateStock} className="space-y-4">
            <Field label="SKU"><input required list="erp-stock-skus" value={stockSku} onChange={(e) => { setStockSku(e.target.value); setStockReadback(null); }} className="field font-mono" placeholder="Enter or select a SKU" /><datalist id="erp-stock-skus">{allVariants.filter(({ variant }) => variant.sku).map(({ product, variant }) => <option key={variant.variantId} value={variant.sku!}>{product.name} · {variant.size || 'Standard'} · current {variant.stock}</option>)}</datalist></Field>
            <Field label="Quantity"><input required type="number" min="0" max="1000000" step="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="field" /></Field>
            <p className="text-xs leading-5 text-slate-500">The backend reconciles orders placed after the supplied snapshot timestamp. After the write, this page reads the SKU again and confirms the persisted quantity.</p>
            <button disabled={saving || loading} className="inline-flex h-10 items-center gap-2 rounded bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Warehouse size={16} />{saving ? 'Updating and verifying…' : 'Update stock'}</button>
          </form>
          {stockReadback !== null && <div className="mt-5 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"><ShieldCheck size={17} /> Readback verified: {stockSku} now has {stockReadback} units.</div>}
        </section>
      )}

      {tab === 'webhook' && (
        <section className="max-w-2xl rounded-md border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-sky-100 text-sky-800"><Send size={18} /></div><div><h3 className="font-semibold text-slate-900">Order status event</h3><p className="text-sm text-slate-500">Signed server-side; event IDs are generated uniquely for duplicate protection.</p></div></div>
          <form onSubmit={sendWebhook} className="space-y-4">
            <Field label="Order ID"><input required value={webhookOrderId} onChange={(e) => setWebhookOrderId(e.target.value)} className="field font-mono" placeholder="24-character order ID" list="erp-order-ids" /><datalist id="erp-order-ids">{orders.map((order) => <option key={order.orderId} value={order.orderId}>{order.customer.name || 'Unknown'} · {order.orderStatus}</option>)}</datalist></Field>
            <Field label="New status"><select value={webhookStatus} onChange={(e) => setWebhookStatus(e.target.value)} className="field"><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></Field>
            <Field label="ERP order ID (optional)"><input value={erpOrderId} onChange={(e) => setErpOrderId(e.target.value)} className="field" /></Field>
            <Field label="Tracking number (optional)"><input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="field" /></Field>
            <p className="text-xs leading-5 text-slate-500">Only forward transitions are accepted. Delivered and cancelled orders are final; stale or duplicate events do not reapply changes.</p>
            <button disabled={saving || orders.length === 0} className="inline-flex h-10 items-center gap-2 rounded bg-sky-800 px-4 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-50"><Send size={16} />{saving ? 'Sending…' : 'Send signed event'}</button>
          </form>
        </section>
      )}

      {tab === 'images' && (
        <section className="max-w-2xl rounded-md border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-amber-100 text-amber-900"><ImagePlus size={19} /></div><div><h3 className="font-semibold text-slate-900">Product image upload</h3><p className="text-sm text-slate-500">Uploads to the configured provider and returns a reusable HTTPS URL.</p></div></div>
          <form onSubmit={uploadImage} className="space-y-4">
            <Field label="Image file"><input required type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => { setImageFile(e.target.files?.[0] || null); setImageUrl(''); }} className="field file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold" /></Field>
            <p className="text-xs text-slate-500">JPG, PNG, WEBP; maximum 15 MB. The backend validates the file bytes and MIME type.</p>
            <button disabled={saving || !imageFile} className="inline-flex h-10 items-center gap-2 rounded bg-amber-800 px-4 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-50"><Upload size={16} />{saving ? 'Uploading…' : 'Upload image'}</button>
          </form>
          {imageUrl && <div className="mt-5 space-y-3 rounded border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Upload complete</p><div className="flex flex-col gap-2 sm:flex-row"><input readOnly value={imageUrl} className="field flex-1 bg-white" /><button onClick={() => void navigator.clipboard.writeText(imageUrl).then(() => toast.success('URL copied'))} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-900"><Clipboard size={15} /> Copy URL</button></div><Image src={getImageUrl(imageUrl)} alt="Uploaded product asset" width={144} height={144} unoptimized onError={handleImageError} className="h-36 w-36 rounded border border-emerald-200 bg-white object-contain p-2" /></div>}
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-800">{value}</span></div>;
}

function Pagination({ page, pagination, onChange }: { page: number; pagination: ErpPagination | null; onChange: (page: number) => void }) {
  return <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm"><span className="text-slate-500">Page {pagination?.page ?? page} of {pagination?.pages ?? 0} · {pagination?.total ?? 0} records</span><div className="flex gap-2"><button disabled={!pagination || page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-700 disabled:opacity-40"><ChevronLeft size={16} /></button><button disabled={!pagination || page >= pagination.pages} onClick={() => onChange(page + 1)} aria-label="Next page" className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-700 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>;
}

