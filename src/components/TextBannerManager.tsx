'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface TextBanner {
  _id?: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
}

export default function TextBannerManager() {
  const [banners, setBanners] = useState<TextBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TextBanner>({
    title: '',
    description: '',
    ctaText: '',
    ctaUrl: '',
    backgroundColor: '#A68B5B',
    textColor: '#FFFFFF',
    isActive: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/banners`);
      setBanners(response.data.data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (banner: TextBanner) => {
    setEditingId(banner._id || null);
    setFormData(banner);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`${API_URL}/banners/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/banners`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        ctaText: '',
        ctaUrl: '',
        backgroundColor: '#A68B5B',
        textColor: '#FFFFFF',
        isActive: true,
      });
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/banners/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBanners();
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Text Banners</h2>

      {/* Form */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="font-bold mb-3">{editingId ? 'Edit Banner' : 'Create Banner'}</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2 h-20 resize-none"
          />
          <input
            type="text"
            placeholder="CTA Text"
            value={formData.ctaText}
            onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="CTA URL"
            value={formData.ctaUrl}
            onChange={e => setFormData({ ...formData, ctaUrl: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Background Color</label>
              <input
                type="color"
                value={formData.backgroundColor}
                onChange={e => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-full h-10 border rounded cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Text Color</label>
              <input
                type="color"
                value={formData.textColor}
                onChange={e => setFormData({ ...formData, textColor: e.target.value })}
                className="w-full h-10 border rounded cursor-pointer"
              />
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            Active
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  title: '',
                  description: '',
                  ctaText: '',
                  ctaUrl: '',
                  backgroundColor: '#A68B5B',
                  textColor: '#FFFFFF',
                  isActive: true,
                });
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div>Loading banners...</div>
      ) : (
        <div className="space-y-2">
          {banners.map(banner => (
            <div
              key={banner._id}
              className="p-4 border rounded flex justify-between items-start"
              style={{ backgroundColor: banner.backgroundColor, color: banner.textColor }}
            >
              <div>
                <h3 className="font-bold">{banner.title}</h3>
                <p className="text-sm">{banner.description}</p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(banner)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(banner._id || '')}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
