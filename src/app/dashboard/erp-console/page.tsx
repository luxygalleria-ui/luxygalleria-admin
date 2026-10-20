'use client';

import { useEffect, useState } from 'react';
import axios, { getApiBaseUrl } from '../../../services/apiClient';

// Test console for the ERP API. Requests go to the backend's admin-only /erp-console routes, which sign them
// server-side (the ERP secret never reaches the browser) and return the ERP API's real status and JSON body.

type Json = Record<string, unknown>;
type ErpResult = { request: { method: string; path: string }; status: number; durationMs: number; body: unknown };
type PanelState = { loading: boolean; result?: ErpResult; error?: string };

const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Drops empty inputs so optional fields are omitted rather than sent blank. */
const clean = (o: Record<string, unknown>): Json =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0)));
/** Numbers as numbers; anything unparsable is still sent so the API's own validation message is shown. */
const num = (v: string) => (v.trim() === '' ? undefined : Number.isFinite(Number(v)) ? Number(v) : v);
const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const nowIso = () => new Date().toISOString();

const TABS = [
  { id: 'stock', label: 'Stock Update', method: 'PUT', write: true },
  { id: 'item-add', label: 'Item Add', method: 'POST', write: true },
  { id: 'item-edit', label: 'Item Edit', method: 'PATCH', write: true },
  { id: 'orders', label: 'Order List', method: 'GET', write: false },
  { id: 'order', label: 'Order Details', method: 'GET', write: false },
  { id: 'status', label: 'Order Status Webhook', method: 'POST', write: true },
  { id: 'image', label: 'Image Upload', method: 'POST', write: true },
] as const;
type TabId = (typeof TABS)[number]['id'];

const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#A68B5B]/40';
const label = 'block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1';

function Field({ name, hint, children }: { name: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={label}>{name}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function NowButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
      Now
    </button>
  );
}

/** Plain-language reading of the ERP API's authentication and availability errors. */
const explain = (status: number, body: unknown): string | null => {
  const message = typeof body === 'object' && body && 'message' in body ? String((body as Json).message) : '';
  if (status === 401) {
    if (/Replayed/i.test(message)) return 'The ERP API saw this exact signed request already. Send it again; the console signs a fresh one.';
    if (/Timestamp/i.test(message)) return 'The signing timestamp was outside the ±300 s window: the server clock may be wrong.';
    if (/Signature/i.test(message)) return 'The signature did not match. The ERP key configured for the console may not match the server keys.';
    return 'The ERP API did not accept the console credentials (ERP_CONSOLE_KEY_ID / ERP_API_KEYS on the backend).';
  }
  if (status === 503) return 'The ERP API reports that it is not configured on this server (missing keys or image storage).';
  if (status === 429) return 'Rate limited by the ERP API. Wait a minute and try again.';
  return null;
};

function ResultPanel({ state }: { state: PanelState }) {
  if (state.loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> Sending request…
      </div>
    );
  }
  if (state.error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{state.error}</div>;
  }
  if (!state.result) {
    return <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">The response will appear here.</div>;
  }
  const { request, status, durationMs, body } = state.result;
  const ok = status >= 200 && status < 300;
  const errors = typeof body === 'object' && body && Array.isArray((body as Json).errors) ? ((body as Json).errors as Json[]) : [];
  const message = typeof body === 'object' && body && 'message' in body ? String((body as Json).message) : '';
  const hint = explain(status, body);
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 font-bold ${ok ? 'bg-[#dcfce7] text-[#16a34a]' : status >= 500 ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#fef3c7] text-[#b45309]'}`}>
          HTTP {status}
        </span>
        <code className="break-all text-slate-600">{request.method} {request.path}</code>
        <span className="text-slate-400">{durationMs} ms</span>
      </div>
      {hint && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{hint}</div>}
      {!ok && message && <p className="text-sm font-semibold text-red-700">{message}</p>}
      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((e, i) => (
            <li key={i}>
              {e.field ? <strong>{String(e.field)}: </strong> : null}
              {String(e.message ?? e.code ?? JSON.stringify(e))}
              {e.code && e.message ? <span className="text-red-400"> ({String(e.code)})</span> : null}
            </li>
          ))}
        </ul>
      )}
      <pre className="max-h-[480px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
      </pre>
    </div>
  );
}

type Variant = { sku: string; size: string; volume: string; flavor: string; offerPrice: string; actualPrice: string; weight: string; stock: string; image: string };
const emptyVariant = (): Variant => ({ sku: '', size: '', volume: '', flavor: '', offerPrice: '', actualPrice: '', weight: '', stock: '', image: '' });

export default function ErpConsolePage() {
  const [tab, setTab] = useState<TabId>('stock');
  const [consoleInfo, setConsoleInfo] = useState<{ enabled: boolean; keyId: string | null } | null>(null);
  const [panels, setPanels] = useState<Partial<Record<TabId, PanelState>>>({});
  const apiBase = getApiBaseUrl();

  // Stock
  const [stock, setStock] = useState({ sku: '', quantity: '', asOf: '' });
  // Item add
  const [item, setItem] = useState({ name: '', description: '', category: '', brand: '', brandId: '', imageUrls: '' });
  const [variants, setVariants] = useState<Variant[]>([emptyVariant()]);
  // Item edit
  const [edit, setEdit] = useState({ sku: '', name: '', description: '', category: '', brand: '', brandId: '', imageUrls: '', size: '', volume: '', flavor: '', offerPrice: '', actualPrice: '', weight: '', image: '' });
  // Orders
  const [list, setList] = useState({ page: '', limit: '', status: '', paymentStatus: '', updatedSince: '' });
  const [orderId, setOrderId] = useState('');
  // Webhook
  const [hook, setHook] = useState({ eventId: '', orderId: '', erpOrderId: '', status: 'shipped', trackingNumber: '', occurredAt: '' });
  // Image
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    axios.get('/erp-console/status')
      .then((res) => setConsoleInfo(res.data.data))
      .catch(() => setConsoleInfo({ enabled: false, keyId: null }));
  }, []);

  const setPanel = (id: TabId, state: PanelState) => setPanels((p) => ({ ...p, [id]: state }));

  const send = async (id: TabId, path: string, data?: Json | FormData) => {
    const def = TABS.find((t) => t.id === id)!;
    if (def.write && !window.confirm(`Send ${def.method} ${path.replace(/\?.*/, '')} to ${apiBase}?\n\nThis WRITES data on that server. Use a staging environment.`)) {
      return;
    }
    setPanel(id, { loading: true });
    try {
      const headers: Record<string, string> = {};
      if (def.write) headers['X-ERP-Console-Confirm'] = 'write';
      if (data instanceof FormData) headers['Content-Type'] = 'multipart/form-data';
      const res = await axios.request({ method: def.method, url: `/erp-console${path}`, data, headers });
      setPanel(id, { loading: false, result: res.data.data as ErpResult });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const msg = e.response?.data?.message || e.message || 'Request failed';
      setPanel(id, { loading: false, error: e.response?.status ? `Console error (HTTP ${e.response.status}): ${msg}` : msg });
    }
  };

  const enc = encodeURIComponent;
  const fail = (id: TabId, error: string) => setPanel(id, { loading: false, error });

  const submit: Record<TabId, () => void> = {
    stock: () => {
      if (!stock.sku.trim()) return fail('stock', 'Enter a SKU.');
      send('stock', `/stock/${enc(stock.sku.trim())}`, clean({ quantity: num(stock.quantity), asOf: stock.asOf.trim() }));
    },
    'item-add': () => {
      send('item-add', '/items', clean({
        name: item.name.trim(), description: item.description.trim(), category: item.category.trim(),
        brand: item.brand.trim(), brandId: item.brandId.trim(), imageUrls: lines(item.imageUrls),
        variants: variants.map((v) => clean({
          sku: v.sku.trim(), size: v.size.trim(), volume: v.volume.trim(), flavor: v.flavor.trim(),
          offerPrice: num(v.offerPrice), actualPrice: num(v.actualPrice), weight: num(v.weight), stock: num(v.stock), image: v.image.trim(),
        })),
      }));
    },
    'item-edit': () => {
      if (!edit.sku.trim()) return fail('item-edit', 'Enter the SKU to edit.');
      send('item-edit', `/items/${enc(edit.sku.trim())}`, clean({
        name: edit.name.trim(), description: edit.description.trim(), category: edit.category.trim(),
        brand: edit.brand.trim(), brandId: edit.brandId.trim(), imageUrls: lines(edit.imageUrls),
        size: edit.size.trim(), volume: edit.volume.trim(), flavor: edit.flavor.trim(),
        offerPrice: num(edit.offerPrice), actualPrice: num(edit.actualPrice), weight: num(edit.weight), image: edit.image.trim(),
      }));
    },
    orders: () => {
      const q = new URLSearchParams(clean({ page: list.page.trim(), limit: list.limit.trim(), status: list.status, paymentStatus: list.paymentStatus, updatedSince: list.updatedSince.trim() }) as Record<string, string>).toString();
      send('orders', `/orders${q ? `?${q}` : ''}`);
    },
    order: () => {
      if (!OBJECT_ID.test(orderId.trim())) return fail('order', 'Order ID must be the 24-character hexadecimal orderId shown in the order list.');
      send('order', `/orders/${orderId.trim()}`);
    },
    status: () => {
      send('status', '/webhooks/order-status', clean({
        eventId: hook.eventId.trim(), orderId: hook.orderId.trim(), erpOrderId: hook.erpOrderId.trim(),
        status: hook.status, trackingNumber: hook.trackingNumber.trim(), occurredAt: hook.occurredAt.trim(),
      }));
    },
    image: () => {
      if (!file) return fail('image', 'Choose an image file.');
      if (!IMAGE_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))) return fail('image', 'Only JPG, JPEG, PNG or WEBP files are accepted.');
      if (file.size > MAX_IMAGE_BYTES) return fail('image', 'The image is larger than 15 MB.');
      const form = new FormData();
      form.append('image', file);
      send('image', '/images', form);
    },
  };

  const active = TABS.find((t) => t.id === tab)!;
  const panel = panels[tab] ?? { loading: false };
  const uploadedUrl = (() => {
    const body = panels.image?.result?.body as { data?: { url?: string } } | undefined;
    return body?.data?.url;
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ERP API Console</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sends real, signed requests to the seven ERP endpoints and shows the actual response. Signing happens on the server.
        </p>
      </div>

      <div className={`rounded-xl border p-4 text-sm ${consoleInfo?.enabled ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
        <p><strong>Target server:</strong> <code className="break-all">{apiBase}</code></p>
        {consoleInfo === null ? (
          <p className="mt-1">Checking console configuration…</p>
        ) : consoleInfo.enabled ? (
          <p className="mt-1">Signing with ERP key <code>{consoleInfo.keyId}</code>. Write tests change data on this server: use staging, never production.</p>
        ) : (
          <p className="mt-1">The console is not enabled on this server. Set <code>ERP_CONSOLE_KEY_ID</code> to a key from <code>ERP_API_KEYS</code> on a staging backend.</p>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#0A192F] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => { e.preventDefault(); submit[tab](); }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{active.label}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${active.write ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#dcfce7] text-[#16a34a]'}`}>
              {active.method} · {active.write ? 'writes data' : 'read-only'}
            </span>
          </div>

          {tab === 'stock' && (
            <>
              <Field name="SKU *"><input className={input} value={stock.sku} onChange={(e) => setStock({ ...stock, sku: e.target.value })} /></Field>
              <Field name="Quantity *" hint="Whole number 0 – 1,000,000: the ERP's sellable quantity at asOf.">
                <input className={input} inputMode="numeric" value={stock.quantity} onChange={(e) => setStock({ ...stock, quantity: e.target.value })} />
              </Field>
              <Field name="asOf *" hint="ISO 8601 with timezone, e.g. 2026-10-20T09:30:00Z. Not more than 5 minutes in the future.">
                <div className="flex gap-2"><input className={input} value={stock.asOf} onChange={(e) => setStock({ ...stock, asOf: e.target.value })} /><NowButton onClick={() => setStock({ ...stock, asOf: nowIso() })} /></div>
              </Field>
            </>
          )}

          {tab === 'item-add' && (
            <>
              <p className="text-xs text-slate-500">Creates a product, or updates the one that already carries these SKUs. Name, description and category are required when creating. Stock of an existing variant is never changed here.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="Name"><input className={input} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></Field>
                <Field name="Category" hint="Existing category name or id"><input className={input} value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })} /></Field>
                <Field name="Brand" hint="Existing brand name"><input className={input} value={item.brand} onChange={(e) => setItem({ ...item, brand: e.target.value })} /></Field>
                <Field name="Brand ID" hint="24-character id; wins over Brand"><input className={input} value={item.brandId} onChange={(e) => setItem({ ...item, brandId: e.target.value })} /></Field>
              </div>
              <Field name="Description"><textarea className={input} rows={3} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></Field>
              <Field name="Image URLs" hint="One https URL per line, max 10. Replaces the product's image list.">
                <textarea className={input} rows={2} value={item.imageUrls} onChange={(e) => setItem({ ...item, imageUrls: e.target.value })} />
              </Field>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={label}>Variants * (1 – 50)</span>
                  <button type="button" disabled={variants.length >= 50} onClick={() => setVariants([...variants, emptyVariant()])} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">+ Add variant</button>
                </div>
                {variants.map((v, i) => {
                  const set = (k: keyof Variant, val: string) => setVariants(variants.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
                  return (
                    <fieldset key={i} className="rounded-xl border border-slate-200 p-3">
                      <legend className="px-1 text-xs font-semibold text-slate-500">Variant {i + 1}</legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field name="SKU *"><input className={input} value={v.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
                        <Field name="Size"><input className={input} value={v.size} onChange={(e) => set('size', e.target.value)} /></Field>
                        <Field name="Volume" hint="Alias of size"><input className={input} value={v.volume} onChange={(e) => set('volume', e.target.value)} /></Field>
                        <Field name="Flavor"><input className={input} value={v.flavor} onChange={(e) => set('flavor', e.target.value)} /></Field>
                        <Field name="Offer price" hint="Required for a new variant"><input className={input} inputMode="decimal" value={v.offerPrice} onChange={(e) => set('offerPrice', e.target.value)} /></Field>
                        <Field name="Actual price (MRP)" hint="Required for a new variant"><input className={input} inputMode="decimal" value={v.actualPrice} onChange={(e) => set('actualPrice', e.target.value)} /></Field>
                        <Field name="Weight (kg)"><input className={input} inputMode="decimal" value={v.weight} onChange={(e) => set('weight', e.target.value)} /></Field>
                        <Field name="Stock" hint="New variants only"><input className={input} inputMode="numeric" value={v.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
                        <Field name="Image URL"><input className={input} value={v.image} onChange={(e) => set('image', e.target.value)} /></Field>
                      </div>
                      {variants.length > 1 && (
                        <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="mt-2 text-xs font-medium text-red-600 hover:underline">Remove variant</button>
                      )}
                    </fieldset>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'item-edit' && (
            <>
              <p className="text-xs text-slate-500">Changes only the fields you fill in. Product fields apply to every variant of the product. SKU and stock cannot be changed here.</p>
              <Field name="SKU *"><input className={input} value={edit.sku} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['name', 'category', 'brand', 'brandId', 'size', 'volume', 'flavor', 'offerPrice', 'actualPrice', 'weight', 'image'] as const).map((k) => (
                  <Field key={k} name={{ name: 'Name', category: 'Category', brand: 'Brand', brandId: 'Brand ID', size: 'Size', volume: 'Volume', flavor: 'Flavor', offerPrice: 'Offer price', actualPrice: 'Actual price (MRP)', weight: 'Weight (kg)', image: 'Variant image URL' }[k]}>
                    <input className={input} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                  </Field>
                ))}
              </div>
              <Field name="Description"><textarea className={input} rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <Field name="Image URLs" hint="One https URL per line, max 10. Replaces the product's image list.">
                <textarea className={input} rows={2} value={edit.imageUrls} onChange={(e) => setEdit({ ...edit, imageUrls: e.target.value })} />
              </Field>
            </>
          )}

          {tab === 'orders' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="Page" hint="Default 1"><input className={input} inputMode="numeric" value={list.page} onChange={(e) => setList({ ...list, page: e.target.value })} /></Field>
              <Field name="Limit" hint="1 – 100, default 50"><input className={input} inputMode="numeric" value={list.limit} onChange={(e) => setList({ ...list, limit: e.target.value })} /></Field>
              <Field name="Order status">
                <select className={input} value={list.status} onChange={(e) => setList({ ...list, status: e.target.value })}>
                  <option value="">Any</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field name="Payment status">
                <select className={input} value={list.paymentStatus} onChange={(e) => setList({ ...list, paymentStatus: e.target.value })}>
                  <option value="">Any</option>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field name="Updated since" hint="ISO 8601 with timezone; returns orders updated at or after this time">
                  <div className="flex gap-2"><input className={input} value={list.updatedSince} onChange={(e) => setList({ ...list, updatedSince: e.target.value })} /><NowButton onClick={() => setList({ ...list, updatedSince: nowIso() })} /></div>
                </Field>
              </div>
            </div>
          )}

          {tab === 'order' && (
            <Field name="Order ID *" hint="24-character hexadecimal orderId from the order list">
              <input className={`${input} font-mono`} maxLength={24} value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            </Field>
          )}

          {tab === 'status' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="Event ID *" hint="Unique per event; a repeat is acknowledged as a duplicate">
                <div className="flex gap-2"><input className={input} value={hook.eventId} onChange={(e) => setHook({ ...hook, eventId: e.target.value })} />
                  <button type="button" onClick={() => setHook({ ...hook, eventId: `console-${crypto.randomUUID()}` })} className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">New</button></div>
              </Field>
              <Field name="Order ID *" hint="24-character website orderId"><input className={`${input} font-mono`} maxLength={24} value={hook.orderId} onChange={(e) => setHook({ ...hook, orderId: e.target.value })} /></Field>
              <Field name="Status *">
                <select className={input} value={hook.status} onChange={(e) => setHook({ ...hook, status: e.target.value })}>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field name="ERP order ID"><input className={input} value={hook.erpOrderId} onChange={(e) => setHook({ ...hook, erpOrderId: e.target.value })} /></Field>
              <Field name="Tracking number"><input className={input} value={hook.trackingNumber} onChange={(e) => setHook({ ...hook, trackingNumber: e.target.value })} /></Field>
              <Field name="Occurred at *" hint="ISO 8601 with timezone">
                <div className="flex gap-2"><input className={input} value={hook.occurredAt} onChange={(e) => setHook({ ...hook, occurredAt: e.target.value })} /><NowButton onClick={() => setHook({ ...hook, occurredAt: nowIso() })} /></div>
              </Field>
              <p className="text-xs text-slate-500 sm:col-span-2">Allowed: processing → shipped / delivered / cancelled; shipped → delivered / cancelled. Delivered and cancelled are final. An applied change emails the customer.</p>
            </div>
          )}

          {tab === 'image' && (
            <>
              <Field name="Image *" hint="JPG, PNG or WEBP, up to 15 MB. Sent in the multipart field “image”.">
                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Field>
              {file && <p className="text-xs text-slate-500">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
              {uploadedUrl && (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs">
                  <p className="font-semibold text-slate-700">Uploaded URL (use it in Image URLs or a variant image):</p>
                  <code className="block break-all text-slate-600">{uploadedUrl}</code>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(uploadedUrl)} className="rounded-lg border border-slate-200 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50">Copy URL</button>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={panel.loading || !consoleInfo?.enabled}
            className="w-full rounded-xl bg-[#0A192F] py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {panel.loading ? 'Sending…' : active.write ? `Send ${active.method} (asks for confirmation)` : `Send ${active.method}`}
          </button>
        </form>

        <section className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Response</h2>
          <ResultPanel state={panel} />
        </section>
      </div>
    </div>
  );
}
