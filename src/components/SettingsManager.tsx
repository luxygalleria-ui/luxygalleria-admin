'use client';

import React, { useEffect, useState } from 'react';
import axios from '../services/apiClient';

interface Settings {
  _id?: string;
  footerText: string;
  whatsappNumber: string;
  primaryColor: string;
  secondaryColor: string;
  bannerText: string;
  isBannerActive: boolean;
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<Settings>({
    footerText: '',
    whatsappNumber: '',
    primaryColor: '#A68B5B',
    secondaryColor: '#F5F1E8',
    bannerText: '',
    isBannerActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/settings');
      setSettings(response.data.data || settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put('/settings', settings);
      alert('Settings updated successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const message = error?.response?.data?.message || 'Failed to save settings';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;

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
            placeholder="e.g., 918907076996"
          />
        </div>


        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
