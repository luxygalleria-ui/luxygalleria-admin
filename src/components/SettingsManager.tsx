'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient, { isUnauthenticated } from '../services/apiClient';

/** The fields this form edits. Everything else in the settings document is left exactly as it is. */
interface Settings {
  footerText: string;
  whatsappNumber: string;
  bannerText: string;
  isBannerActive: boolean;
}
const FIELDS: (keyof Settings)[] = ['bannerText', 'isBannerActive', 'footerText', 'whatsappNumber'];

type ApiError = { response?: { status?: number; data?: { message?: string; errors?: { field?: string; message: string }[] } } };

const pick = (doc: Record<string, unknown>): Settings => ({
  bannerText: String(doc.bannerText ?? ''),
  isBannerActive: doc.isBannerActive === true,
  footerText: String(doc.footerText ?? ''),
  whatsappNumber: String(doc.whatsappNumber ?? ''),
});

export default function SettingsManager() {
  // No placeholder values: until the saved document is loaded there is nothing to edit or save
  const [saved, setSaved] = useState<Settings | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiClient.get('/settings');
        if (cancelled) return;
        const doc = response.data?.data;
        if (!doc || typeof doc !== 'object') throw new Error('The server returned no settings document');
        setSaved(pick(doc));
        setSettings(pick(doc));
        setLoadError('');
      } catch (error) {
        if (cancelled || isUnauthenticated(error)) return;
        console.error('Error fetching settings:', error);
        const e = error as ApiError & { message?: string };
        setLoadError(e.response?.data?.message || e.message || 'Could not load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const changed = saved && settings ? FIELDS.filter((k) => settings[k] !== saved[k]) : [];

  const handleSave = async () => {
    if (!settings || !changed.length) return;
    setSaving(true);
    setErrors({});
    try {
      // Only the edited fields: anything else in the document (colours, shipping, collections…) is untouched
      const res = await apiClient.put('/settings', Object.fromEntries(changed.map((k) => [k, settings[k]])));
      const next = pick(res.data.data);
      setSaved(next);
      setSettings(next);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      const data = (error as ApiError).response?.data;
      const fieldErrors: Record<string, string> = {};
      for (const e of data?.errors || []) if (e.field) fieldErrors[e.field] = e.message;
      setErrors(fieldErrors);
      toast.error(data?.message || 'Failed to save settings. Nothing was changed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;
  if (loadError || !settings) {
    return (
      <div className="p-6 bg-white rounded-lg shadow max-w-2xl" role="alert">
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-red-700 font-medium">Settings could not be loaded, so they cannot be edited right now.</p>
        <p className="text-sm text-red-600 mt-1">{loadError}</p>
        <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }} className="mt-4 bg-[#8B5E34] text-white px-4 py-2 rounded font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      
      <div className="space-y-4">
          <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold mb-3">Top Banner</h3>
          <p className="text-xs text-gray-500 mb-3">Each new line = a separate banner sentence. Use Enter/Return to add multiple lines.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Banner Text</label>
              <textarea
                rows={4}
                value={settings.bannerText}
                onChange={e => setSettings({ ...settings, bannerText: e.target.value })}
                className="w-full border rounded px-3 py-2 resize-y font-mono text-sm"
                placeholder={"Free delivery on orders above ₹999\nShop premium imported snacks now\n🎉 New arrivals every week!"}
              />
              <p className="text-xs text-gray-400 mt-1">Preview: {settings.bannerText.split('\n').filter(Boolean).length} line(s)</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isBannerActive}
                onChange={e => setSettings({ ...settings, isBannerActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Show Banner on Website</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Footer Text</label>
          <textarea
            value={settings.footerText}
            onChange={e => setSettings({ ...settings, footerText: e.target.value })}
            className="w-full border rounded px-3 py-2 h-20 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
          <input
            type="text"
            value={settings.whatsappNumber}
            onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., 919847978098"
          />
          {errors.whatsappNumber && <p className="text-xs text-red-600 mt-1">{errors.whatsappNumber}</p>}
        </div>

        <div className="p-4 border rounded bg-gray-50 text-sm">
          <h3 className="font-bold mb-1">Shipping, pickup and tax</h3>
          <p className="text-gray-600">
            Shipping charges, store pickup, chocolate shipping and GST are managed under{' '}
            <a href="/dashboard/checkout/shipping" className="text-[#8B5E34] font-medium underline">Checkout &amp; Fulfillment</a>.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || changed.length === 0}
          className="w-full bg-[#8B5E34] text-white py-2 rounded font-medium hover:bg-[#6B5344] disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : changed.length ? 'Save Settings' : 'No changes'}
        </button>
      </div>
    </div>
  );
}
