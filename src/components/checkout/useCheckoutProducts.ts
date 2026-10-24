'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient, { isUnauthenticated } from '../../services/apiClient';
import { apiErrorBody } from './useCheckoutSection';

export type CheckoutProduct = {
  _id: string; name: string; category?: string; image: string | null;
  requiresSpecialPackaging: boolean; taxRate: number | null; hsnCode: string;
};
type Editable = Pick<CheckoutProduct, 'requiresSpecialPackaging' | 'taxRate' | 'hsnCode'>;

/** Products with their checkout flags; saves only rows whose `fields` changed. */
export function useCheckoutProducts(fields: (keyof Editable)[]) {
  const [saved, setSaved] = useState<CheckoutProduct[]>([]);
  const [draft, setDraft] = useState<CheckoutProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/settings/checkout/products');
        if (cancelled) return;
        setSaved(res.data.data);
        setDraft(res.data.data);
        setLoadError('');
      } catch (err) {
        if (cancelled || isUnauthenticated(err)) return;
        setLoadError(apiErrorBody(err)?.message || 'Could not load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);
  const load = () => { setLoading(true); setLoadError(''); setReloadKey((k) => k + 1); };

  const changed = useMemo(() => {
    const before = new Map(saved.map((p) => [p._id, p]));
    return draft.filter((p) => fields.some((f) => before.get(p._id)?.[f] !== p[f]));
  }, [saved, draft, fields]);

  const update = (id: string, patch: Partial<Editable>) => setDraft((d) => d.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  const cancel = () => setDraft(saved);

  const save = async () => {
    if (!changed.length) return;
    setSaving(true);
    try {
      const updates = changed.map((p) => ({ id: p._id, ...Object.fromEntries(fields.map((f) => [f, p[f]])) }));
      await apiClient.put('/settings/checkout/products', { updates });
      toast.success(`${changed.length} product(s) updated`);
      setSaved(draft);
    } catch (err) {
      const data = apiErrorBody(err);
      const detail = data?.errors?.[0]?.message ? ` (${data.errors[0].message})` : '';
      toast.error(`${data?.message || 'Could not save products'}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return { products: draft, loading, loadError, reload: load, saving, changed, update, cancel, save };
}
