'use client';

import { Card, Field, NumberInput, SaveBar, SectionState, TextInput, Toggle } from '@/components/checkout/fields';
import { useCheckoutSection } from '@/components/checkout/useCheckoutSection';

type Pickup = {
  enabled: boolean; storeName: string; address: string; openingHours: string; phone: string; email: string;
  instructions: string; readyTime: string; charge: number;
};

export default function PickupSettingsPage() {
  const s = useCheckoutSection<Pickup>('pickup');
  const { draft, setDraft, errors } = s;
  const set = <K extends keyof Pickup>(k: K, v: Pickup[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const onSave = async () => {
    if (s.saved?.enabled && draft && !draft.enabled && !window.confirm('Turn off store pickup? Customers will only be able to choose home delivery.')) return;
    await s.save();
  };

  return (
    <div className="space-y-5">
      <SectionState loading={s.loading} loadError={s.loadError} reload={s.reload} isDefault={s.isDefault}
        defaultNote="Not saved yet: store pickup is off. Fill in the store details and enable it to offer in-store collection at checkout." />
      {draft && !s.loading && (
        <>
          <Card title="Store pickup / in-store collection" description="Customers choose between home delivery and collecting from the store. Pickup orders are never charged a delivery fee."
            right={<Toggle checked={draft.enabled} onChange={(v) => set('enabled', v)} label="Offer store pickup" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Store name *" error={errors.storeName}>
                <TextInput value={draft.storeName} onChange={(v) => set('storeName', v)} placeholder="Luxy Galleria" />
              </Field>
              <Field label="Phone *" error={errors.phone}>
                <TextInput value={draft.phone} onChange={(v) => set('phone', v)} placeholder="+91 …" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Store address *" error={errors.address}>
                  <TextInput multiline value={draft.address} onChange={(v) => set('address', v)} />
                </Field>
              </div>
              <Field label="Opening hours *" error={errors.openingHours}>
                <TextInput value={draft.openingHours} onChange={(v) => set('openingHours', v)} placeholder="Mon–Sat 10:00–20:00" />
              </Field>
              <Field label="Email (optional)" error={errors.email}>
                <TextInput value={draft.email} onChange={(v) => set('email', v)} />
              </Field>
              <Field label="Ready for pickup" hint="Shown to customers, e.g. Ready within 24 hours" error={errors.readyTime}>
                <TextInput value={draft.readyTime} onChange={(v) => set('readyTime', v)} />
              </Field>
              <Field label="Pickup charge" hint="0 = free. Only charged when greater than 0." error={errors.charge}>
                <NumberInput value={draft.charge} onChange={(v) => set('charge', v)} suffix="₹" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Pickup instructions" hint="Shown at checkout and on the order" error={errors.instructions}>
                  <TextInput multiline value={draft.instructions} onChange={(v) => set('instructions', v)} placeholder="Bring your order ID and a photo ID." />
                </Field>
              </div>
            </div>
          </Card>
          <Card title="Payment options for pickup orders">
            <div className="space-y-3">
              <Toggle checked onChange={() => undefined} disabled label="Pay Now (online, Razorpay)" description="Payment is taken and verified online before the order is confirmed." />
              <Toggle checked={false} onChange={() => undefined} disabled label="Pay at store" description="Not available yet: needs an unpaid-order flow and a business decision on reservations and no-shows." />
            </div>
          </Card>
          <SaveBar dirty={s.dirty} saving={s.saving} onSave={onSave} onCancel={s.cancel} />
        </>
      )}
    </div>
  );
}
