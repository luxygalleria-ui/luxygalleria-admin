'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import { Card, SaveBar, SectionState, Toggle } from '@/components/checkout/fields';
import { useCheckoutSection } from '@/components/checkout/useCheckoutSection';
import { useCheckoutProducts } from '@/components/checkout/useCheckoutProducts';

type Tax = { enabled: boolean; pricesIncludeTax: boolean; showPriceLabel: boolean };

const isSuperAdmin = () => {
  try { return JSON.parse(localStorage.getItem('adminUser') || '{}')?.role === 'superadmin'; } catch { return false; }
};
const PRODUCT_FIELDS = ['taxRate', 'hsnCode'] as const;

export default function TaxSettingsPage() {
  const s = useCheckoutSection<Tax>('tax');
  const p = useCheckoutProducts([...PRODUCT_FIELDS]);
  const [query, setQuery] = useState('');
  // The server enforces this too; the page only avoids offering edits that will be refused (false while server-rendering)
  const canEdit = useSyncExternalStore(() => () => undefined, isSuperAdmin, () => false);
  const { draft, setDraft } = s;
  const set = <K extends keyof Tax>(k: K, v: Tax[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const missing = p.products.filter((x) => x.taxRate === null).length;
  // The server refuses enabling GST (either mode) until every product has a SAVED rate; say so before saving
  const enableBlocked = !!draft?.enabled && !p.loading && (missing > 0 || p.changed.length > 0)
    ? missing > 0
      ? `GST can be enabled only when every product has a confirmed GST rate: ${missing} product(s) below have none. Enter and save the rates first.`
      : 'Save the GST rates entered below first, then enable GST.'
    : '';
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return p.products.filter((x) => !q || x.name.toLowerCase().includes(q) || x.category?.toLowerCase().includes(q));
  }, [p.products, query]);

  const onSave = async () => {
    if (!s.saved || !draft) return;
    if (enableBlocked) { toast.error(enableBlocked); return; }
    if (s.saved.pricesIncludeTax !== draft.pricesIncludeTax && draft.enabled
      && !window.confirm(draft.pricesIncludeTax
        ? 'Switch to tax-INCLUSIVE prices? Listed prices will be treated as already containing GST; totals stop adding GST.'
        : 'Switch to tax-EXCLUSIVE prices? GST will be ADDED on top of listed prices, so customers pay more for the same listed price.')) return;
    await s.save();
  };

  return (
    <div className="space-y-5">
      {!canEdit && (
        <div className="p-3 border border-slate-200 bg-slate-50 rounded-xl text-sm text-slate-600">View only: tax settings and GST rates can be changed by a super admin.</div>
      )}
      <SectionState loading={s.loading} loadError={s.loadError} reload={s.reload} isDefault={s.isDefault}
        defaultNote="Not saved yet: GST is not shown or calculated at checkout (current behaviour). Confirm each product’s GST rate with your accountant before enabling." />
      {draft && !s.loading && (
        <>
          <Card title="GST display and calculation" description="Calculated on the server for checkout, the payment amount and the saved order. Shipping and packaging fees are not taxed here (pending accounting confirmation).">
            <fieldset disabled={!canEdit} className="space-y-4">
              <Toggle checked={draft.enabled} onChange={(v) => set('enabled', v)} label="Show GST at checkout and on orders" description="Off: no GST lines anywhere (current behaviour). Requires a confirmed GST rate on every product." />
              {(s.errors.enabled || enableBlocked) && (
                <p className={`text-sm ${s.errors.enabled ? 'text-red-600' : 'text-amber-700'}`} role="alert">{s.errors.enabled || enableBlocked}</p>
              )}
              <div className={`space-y-3 ${draft.enabled ? '' : 'opacity-60'}`}>
                <p className="text-sm font-medium text-slate-700">Listed product prices are…</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="incl" className="mt-1 accent-[#8B5E34]" checked={draft.pricesIncludeTax} onChange={() => set('pricesIncludeTax', true)} />
                  <span className="text-sm"><strong>Inclusive of GST</strong> — the customer pays the listed price; GST is shown as part of it.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="incl" className="mt-1 accent-[#8B5E34]" checked={!draft.pricesIncludeTax} onChange={() => set('pricesIncludeTax', false)} />
                  <span className="text-sm"><strong>Exclusive of GST</strong> — GST is added at checkout on top of listed prices.</span>
                </label>
                <Toggle checked={draft.showPriceLabel} onChange={(v) => set('showPriceLabel', v)} label="Label prices on the storefront" description="“Inclusive of GST” or “+ GST” next to prices." />
              </div>
              {s.errors.pricesIncludeTax && <p className="text-sm text-red-600">{s.errors.pricesIncludeTax}</p>}
            </fieldset>
          </Card>
          {canEdit && <SaveBar dirty={s.dirty} saving={s.saving} onSave={onSave} onCancel={s.cancel} />}
        </>
      )}

      <Card title="GST rate per product" description={`No store-wide default rate is applied. ${missing} product(s) without a rate.`}
        right={<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="w-full sm:w-64 border border-slate-300 rounded-lg px-3 py-2 text-sm" />}>
        {p.loading ? <p className="text-sm text-slate-500 animate-pulse">Loading products…</p>
          : p.loadError ? <div className="text-sm text-red-700 flex items-center gap-3">{p.loadError}<button onClick={p.reload} className="px-3 py-1 rounded bg-red-600 text-white">Retry</button></div>
          : (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="text-left text-xs text-slate-500 uppercase sticky top-0 bg-white">
                  <tr><th className="py-2 pr-3">Product</th><th className="py-2 pr-3 w-32">GST %</th><th className="py-2 w-36">HSN code</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((x) => (
                    <tr key={x._id}>
                      <td className="py-2 pr-3">
                        <span className="block font-medium text-slate-800">{x.name}</span>
                        {x.category && <span className="block text-xs text-slate-500">{x.category}</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min={0} max={100} step="0.01" disabled={!canEdit} placeholder="Not set"
                          value={x.taxRate ?? ''} onChange={(e) => p.update(x._id, { taxRate: e.target.value === '' ? null : Number(e.target.value) })}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 disabled:bg-slate-50" />
                      </td>
                      <td className="py-2">
                        <input type="text" inputMode="numeric" maxLength={8} disabled={!canEdit} value={x.hsnCode}
                          onChange={(e) => p.update(x._id, { hsnCode: e.target.value.replace(/\D/g, '') })}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 disabled:bg-slate-50" />
                      </td>
                    </tr>
                  ))}
                  {!visible.length && <tr><td colSpan={3} className="py-4 text-slate-500">No products match.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        {canEdit && <div className="mt-4"><SaveBar dirty={p.changed.length > 0} saving={p.saving} onSave={p.save} onCancel={p.cancel} /></div>}
      </Card>
    </div>
  );
}
