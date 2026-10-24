'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import apiClient, { isUnauthenticated } from '../../services/apiClient';

export type Section = 'shipping' | 'pickup' | 'chocolate' | 'tax';
export type FieldErrors = Record<string, string>;
type ApiErrorBody = { message?: string; errors?: { field?: string; message: string }[] };

/** The backend's error body, when the request reached it. */
export const apiErrorBody = (err: unknown): ApiErrorBody | undefined =>
  axios.isAxiosError(err) ? (err.response?.data as ApiErrorBody | undefined) : undefined;

/**
 * Loads one checkout settings section from the backend and keeps an editable draft.
 * Saved values always come from the server response; nothing is assumed locally.
 */
export function useCheckoutSection<T>(section: Section) {
  const [saved, setSaved] = useState<T | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Request defined inside the effect (state set only once it settles); reload bumps the key
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/settings/checkout');
        if (cancelled) return;
        const value = res.data.data.settings[section] as T;
        setSaved(value);
        setDraft(structuredClone(value));
        setIsDefault(!res.data.data.saved[section]);
        setLoadError('');
      } catch (err) {
        if (cancelled || isUnauthenticated(err)) return;
        setLoadError(apiErrorBody(err)?.message || 'Could not load settings from the server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [section, reloadKey]);
  const load = () => { setLoading(true); setLoadError(''); setReloadKey((k) => k + 1); };

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  // Unsaved changes survive an accidental tab close only with a prompt
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const cancel = () => { setDraft(structuredClone(saved)); setErrors({}); };

  /** PUT the draft. Returns true when the server accepted it. */
  const save = async (): Promise<boolean> => {
    if (!draft) return false;
    setSaving(true);
    setErrors({});
    try {
      const res = await apiClient.put(`/settings/checkout/${section}`, draft);
      const value = res.data.data.settings[section] as T;
      setSaved(value);
      setDraft(structuredClone(value));
      setIsDefault(false);
      toast.success('Settings saved. Checkout uses them from the next order.');
      return true;
    } catch (err) {
      const data = apiErrorBody(err);
      const fieldErrors: FieldErrors = {};
      for (const e of data?.errors || []) if (e?.field) fieldErrors[e.field] = e.message;
      setErrors(fieldErrors);
      toast.error(data?.message || 'Could not save settings. Nothing was changed.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saved, draft, setDraft, isDefault, loading, loadError, reload: load, saving, errors, dirty, cancel, save };
}

/** Immutable update of a nested path, e.g. set(draft, ['zones', 'kerala', 'land', 'eta'], '2 days'). */
export function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [head, ...rest] = path;
  const source = (obj ?? {}) as Record<string | number, unknown>;
  const copy: Record<string | number, unknown> = Array.isArray(obj) ? [...obj] as unknown as Record<number, unknown> : { ...source };
  copy[head] = setIn(source[head], rest, value);
  return copy as T;
}
