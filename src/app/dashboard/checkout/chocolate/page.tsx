'use client';

import { useMemo, useState } from 'react';
import { Card, Field, MONTHS, NumberInput, SaveBar, SectionState, TextInput, Toggle } from '@/components/checkout/fields';
import { useCheckoutSection } from '@/components/checkout/useCheckoutSection';
import { useCheckoutProducts } from '@/components/checkout/useCheckoutProducts';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';

type Chocolate = {
  enabled: boolean; rateConfirmed: boolean; basis: 'per_weight_step' | 'flat_per_order'; feeAmount: number; unitGrams: number;
  allowedMethods: { land: boolean; air: boolean }; allowedZones: { kerala: boolean; outsideKerala: boolean };
  blockedMonths: number[]; customerNote: string;
};

const PRODUCT_FIELDS = ['requiresSpecialPackaging'] as const;

export default function ChocolateSettingsPage() {
  const s = useCheckoutSection<Chocolate>('chocolate');
  const p = useCheckoutProducts([...PRODUCT_FIELDS]);
  const [query, setQuery] = useState('');
  const { draft, setDraft, errors } = s;
  const set = <K extends keyof Chocolate>(k: K, v: Chocolate[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return p.products.filter((x) => !q || x.name.toLowerCase().includes(q) || x.category?.toLowerCase().includes(q));
  }, [p.products, query]);
  const flagged = p.products.filter((x) => x.requiresSpecialPackaging).length;

  const onSave = async () => {
    if (s.saved?.enabled && draft && !draft.enabled && !window.confirm('Turn off chocolate shipping? The packaging fee and delivery restrictions will stop applying to new orders.')) return;
    await s.save();
  };
  const onSaveProducts = async () => {
    const removed = p.changed.filter((x) => !x.requiresSpecialPackaging).length;
    if (removed && !window.confirm(`Remove special packaging from ${removed} product(s)? They will ship without the packaging fee or restrictions.`)) return;
    await p.save();
  };

  // Illustration from the values on this form (the server does the real calculation)
  const example = draft && (draft.basis === 'flat_per_order' ? draft.feeAmount : Math.ceil(500 / (draft.unitGrams || 1)) * draft.feeAmount);

  return (
    <div className="space-y-5">
      <SectionState loading={s.loading} loadError={s.loadError} reload={s.reload} isDefault={s.isDefault}
        defaultNote="Not saved yet: chocolate shipping is off. The ₹10 per 250 g figure below is a reference only, pending the business owner’s confirmation." />
      {draft && !s.loading && (
        <>
          {!draft.rateConfirmed && (
            <div className="p-3 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-800">
              <strong>Pending confirmation:</strong> the fee below has not been confirmed by the business owner. Chocolate shipping cannot be enabled until you tick “Fee confirmed”.
            </div>
          )}
          <Card title="Chocolate / temperature-sensitive shipping" description="Applies only to products marked below, and only to home delivery (never to store pickup). Charged once per order on the combined weight of those products."
            right={<Toggle checked={draft.enabled} onChange={(v) => set('enabled', v)} label="Enable" disabled={!draft.rateConfirmed && !draft.enabled} />}>
            {errors.rateConfirmed && <p className="text-sm text-red-600 mb-3">{errors.rateConfirmed}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="How the fee is calculated" error={errors.basis}>
                <select value={draft.basis} onChange={(e) => set('basis', e.target.value as Chocolate['basis'])} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="per_weight_step">Per weight step (every started step)</option>
                  <option value="flat_per_order">Flat, once per order</option>
                </select>
              </Field>
              <Field label={draft.basis === 'flat_per_order' ? 'Fee per order' : 'Fee per step'} error={errors.feeAmount}>
                <NumberInput value={draft.feeAmount} onChange={(v) => set('feeAmount', v)} suffix="₹" />
              </Field>
              {draft.basis === 'per_weight_step' && (
                <Field label="Weight step" hint="e.g. 250 g: 260 g counts as 2 steps" error={errors.unitGrams}>
                  <NumberInput value={draft.unitGrams} onChange={(v) => set('unitGrams', v)} suffix="g" step="1" min={1} />
                </Field>
              )}
              <div className="flex items-end pb-2 text-sm text-slate-500">Example: 500 g of chocolate → ₹{Number.isFinite(example) ? example : '—'}</div>
              <div className="sm:col-span-2">
                <Toggle checked={draft.rateConfirmed} onChange={(v) => set('rateConfirmed', v)} label="Fee confirmed by the business owner"
                  description="Required before enabling. Untick to mark the fee as pending again." />
              </div>
            </div>
          </Card>

          <Card title="Where and how chocolate can be delivered" description="At checkout, options that are not allowed here are disabled for carts containing chocolate.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Delivery methods</p>
                <Toggle checked={draft.allowedMethods.land} onChange={(v) => set('allowedMethods', { ...draft.allowedMethods, land: v })} label="Road / surface" />
                <Toggle checked={draft.allowedMethods.air} onChange={(v) => set('allowedMethods', { ...draft.allowedMethods, air: v })} label="Air / flight" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Destinations</p>
                <Toggle checked={draft.allowedZones.kerala} onChange={(v) => set('allowedZones', { ...draft.allowedZones, kerala: v })} label="Kerala" />
                <Toggle checked={draft.allowedZones.outsideKerala} onChange={(v) => set('allowedZones', { ...draft.allowedZones, outsideKerala: v })} label="Outside Kerala" />
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-slate-700 mb-2">Months with no chocolate delivery (store pickup stays available)</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                  {MONTHS.map((m, i) => {
                    const on = draft.blockedMonths.includes(i + 1);
                    return (
                      <button key={m} type="button" aria-pressed={on}
                        onClick={() => set('blockedMonths', on ? draft.blockedMonths.filter((x) => x !== i + 1) : [...draft.blockedMonths, i + 1].sort((a, b) => a - b))}
                        className={`px-2 py-1.5 rounded-lg text-sm border ${on ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                        {m}
                      </button>
                    );
                  })}
                </div>
                {errors.blockedMonths && <p className="text-xs text-red-600 mt-1">{errors.blockedMonths}</p>}
              </div>
              <div className="sm:col-span-2">
                <Field label="Packaging & delivery note for customers" hint="Describe only what the packaging and courier actually provide. Do not promise melt-free delivery unless confirmed." error={errors.customerNote}>
                  <TextInput multiline value={draft.customerNote} onChange={(v) => set('customerNote', v)} placeholder="Packed to reduce heat exposure. Please refrigerate on arrival." />
                </Field>
              </div>
            </div>
          </Card>
          <SaveBar dirty={s.dirty} saving={s.saving} onSave={onSave} onCancel={s.cancel} />
        </>
      )}

      <Card title="Products that need special packaging" description={`${flagged} product(s) marked`}
        right={<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="w-full sm:w-64 border border-slate-300 rounded-lg px-3 py-2 text-sm" />}>
        {p.loading ? <p className="text-sm text-slate-500 animate-pulse">Loading products…</p>
          : p.loadError ? <div className="text-sm text-red-700 flex items-center gap-3">{p.loadError}<button onClick={p.reload} className="px-3 py-1 rounded bg-red-600 text-white">Retry</button></div>
          : (
            <ul className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {visible.map((x) => (
                <li key={x._id}>
                  <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#8B5E34]" checked={x.requiresSpecialPackaging} onChange={(e) => p.update(x._id, { requiresSpecialPackaging: e.target.checked })} />
                    <img src={getImageUrl(x.image || '')} onError={handleImageError} alt="" className="w-10 h-10 rounded object-cover bg-slate-100 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">{x.name}</span>
                      {x.category && <span className="block text-xs text-slate-500">{x.category}</span>}
                    </span>
                  </label>
                </li>
              ))}
              {!visible.length && <li className="py-4 text-sm text-slate-500">No products match.</li>}
            </ul>
          )}
        <div className="mt-4">
          <SaveBar dirty={p.changed.length > 0} saving={p.saving} onSave={onSaveProducts} onCancel={p.cancel} />
        </div>
      </Card>
    </div>
  );
}
