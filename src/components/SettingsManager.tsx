'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');
const API_BASE = API_URL.endsWith('/api/v1')
  ? API_URL
  : API_URL.endsWith('/api')
    ? `${API_URL}/v1`
    : `${API_URL}/api/v1`;

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
      const response = await axios.get(`${API_BASE}/settings`);
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
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API_BASE}/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Banner Text</label>
              <input
                type="text"
                value={settings.bannerText}
                onChange={e => setSettings({ ...settings, bannerText: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Get 20% off on all items!"
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.isBannerActive}
                onChange={e => setSettings({ ...settings, isBannerActive: e.target.checked })}
                className="mr-2"
              />
              Show Banner
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

        <div>
          <label className="block text-sm font-medium mb-1">Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.primaryColor}
              onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
              className="w-16 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={settings.primaryColor}
              onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
              className="flex-1 border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Secondary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.secondaryColor}
              onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
              className="w-16 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={settings.secondaryColor}
              onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
              className="flex-1 border rounded px-3 py-2"
            />
          </div>
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
