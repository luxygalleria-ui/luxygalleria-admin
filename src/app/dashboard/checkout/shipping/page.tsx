'use client';

import { Card, Field, NumberInput, SaveBar, SectionState, TextInput, Toggle } from '@/components/checkout/fields';
import { setIn, useCheckoutSection } from '@/components/checkout/useCheckoutSection';

type Rate = {
  enabled: boolean; weightThresholdG: number; chargeBelow: number; chargeAtOrAbove: number;
  baseWeightKg: number; extraPerKg: number; freeShippingThreshold: number; eta: string;
};
type Zone = { enabled: boolean; land: Rate; air: Rate; note: string };
type Shipping = { zones: { kerala: Zone; outsideKerala: Zone } };

const ZONES = [
  { key: 'kerala', name: 'Kerala', hint: 'Addresses whose state is Kerala.' },
  { key: 'outsideKerala', name: 'Outside Kerala', hint: 'Every other state in India.' },
] as const;
const METHODS = [
  { key: 'land', name: 'Road / surface shipping' },
  { key: 'air', name: 'Air / flight shipping' },
] as const;

/** Names of destinations/methods that were on and would be switched off by this save. */
const switchedOff = (saved: Shipping, draft: Shipping) => {
  const off: string[] = [];
  for (const z of ZONES) {
    if (saved.zones[z.key].enabled && !draft.zones[z.key].enabled) off.push(`all delivery to ${z.name}`);
    for (const m of METHODS) if (saved.zones[z.key][m.key].enabled && !draft.zones[z.key][m.key].enabled) off.push(`${m.name} to ${z.name}`);
  }
  return off;
};

export default function ShippingSettingsPage() {
  const s = useCheckoutSection<Shipping>('shipping');
  const { draft, setDraft, errors } = s;
  const set = (path: (string | number)[], value: unknown) => setDraft((d) => (d ? setIn(d, path, value) : d));
  const err = (path: string) => errors[path];

  const onSave = async () => {
    if (!s.saved || !draft) return;
    const off = switchedOff(s.saved, draft);
    if (off.length && !window.confirm(`This turns off:\n• ${off.join('\n• ')}\n\nCustomers will no longer be able to choose these at checkout. Continue?`)) return;
    await s.save();
  };

  return (
    <div className="space-y-5">
      <SectionState loading={s.loading} loadError={s.loadError} reload={s.reload} isDefault={s.isDefault}
        defaultNote="Not saved yet: these values are today’s shipping rates (road delivery everywhere, air off). Checkout charges stay the same until you save." />
      {draft && !s.loading && (
        <>
          {ZONES.map((z) => {
            const zone = draft.zones[z.key];
            return (
              <Card key={z.key} title={`Delivery: ${z.name}`} description={z.hint}
                right={<Toggle checked={zone.enabled} onChange={(v) => set(['zones', z.key, 'enabled'], v)} label="Deliver here" />}>
                <div className={`space-y-5 ${zone.enabled ? '' : 'opacity-60'}`}>
                  <Field label="Customer note (optional)" hint="Shown at checkout, e.g. service limits." error={err(`zones.${z.key}.note`)}>
                    <TextInput value={zone.note} onChange={(v) => set(['zones', z.key, 'note'], v)} placeholder="e.g. Remote PIN codes may take 2 extra days" />
                  </Field>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {METHODS.map((m) => {
                      const r = zone[m.key];
                      const p = (f: keyof Rate) => ['zones', z.key, m.key, f];
                      const e = (f: keyof Rate) => err(`zones.${z.key}.${m.key}.${f}`);
                      return (
                        <div key={m.key} className="border border-slate-200 rounded-lg p-4 space-y-3">
                          <Toggle checked={r.enabled} onChange={(v) => set(p('enabled'), v)} label={m.name} description={r.enabled ? 'Offered at checkout' : 'Not offered'} />
                          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${r.enabled ? '' : 'opacity-60'}`}>
                            <Field label="Weight threshold" error={e('weightThresholdG')}>
                              <NumberInput value={r.weightThresholdG} onChange={(v) => set(p('weightThresholdG'), v)} suffix="g" step="1" />
                            </Field>
                            <Field label="Charge below threshold" error={e('chargeBelow')}>
                              <NumberInput value={r.chargeBelow} onChange={(v) => set(p('chargeBelow'), v)} suffix="₹" />
                            </Field>
                            <Field label="Charge at/above threshold" error={e('chargeAtOrAbove')}>
                              <NumberInput value={r.chargeAtOrAbove} onChange={(v) => set(p('chargeAtOrAbove'), v)} suffix="₹" />
                            </Field>
                            <Field label="Weight included in base charge" error={e('baseWeightKg')}>
                              <NumberInput value={r.baseWeightKg} onChange={(v) => set(p('baseWeightKg'), v)} suffix="kg" />
                            </Field>
                            <Field label="Extra per started kg beyond that" error={e('extraPerKg')}>
                              <NumberInput value={r.extraPerKg} onChange={(v) => set(p('extraPerKg'), v)} suffix="₹" />
                            </Field>
                            <Field label="Free shipping from order value" hint="0 = no free shipping" error={e('freeShippingThreshold')}>
                              <NumberInput value={r.freeShippingThreshold} onChange={(v) => set(p('freeShippingThreshold'), v)} suffix="₹" />
                            </Field>
                            <div className="sm:col-span-2">
                              <Field label="Estimated delivery time" hint="Shown to customers, e.g. 2–4 business days" error={e('eta')}>
                                <TextInput value={r.eta} onChange={(v) => set(p('eta'), v)} placeholder="2–4 business days" />
                              </Field>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
          {errors.shipping && <p className="text-sm text-red-600">{errors.shipping}</p>}
          <SaveBar dirty={s.dirty} saving={s.saving} onSave={onSave} onCancel={s.cancel} />
        </>
      )}
    </div>
  );
}
