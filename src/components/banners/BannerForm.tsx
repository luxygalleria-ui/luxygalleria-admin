'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { bannerService, type Banner } from '@/services/bannerService';

interface BannerFormProps {
  banner?: Banner | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BannerForm({ banner, onClose, onSuccess }: BannerFormProps) {
  const [formData, setFormData] = useState<Banner>(
    banner || {
      title: '',
      description: '',
      image: '',
      mobileImage: '',
      status: 'ACTIVE',
    }
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isMobile: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isMobile) {
        setMobileImageFile(file);
      } else {
        setImageFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('status', formData.status);

      if (imageFile) {
        submitData.append('image', imageFile);
      }
      if (mobileImageFile) {
        submitData.append('mobileImage', mobileImageFile);
      }

      if (banner?._id) {
        await bannerService.updateBanner(banner._id, submitData);
      } else {
        await bannerService.createBanner(submitData);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {banner ? 'Edit Banner' : 'Create Banner'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Refreshing Drinks Collection"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              placeholder="e.g., Enjoy our premium selection of fresh and delicious drinks"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Desktop Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Desktop Image (2048x768px) *
            </label>
            {formData.image && !imageFile && (
              <p className="text-xs text-gray-500 mb-2">
                Current: {formData.image.substring(0, 50)}...
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, false)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {imageFile && (
              <p className="text-sm text-green-600 mt-1">✓ {imageFile.name}</p>
            )}
          </div>

          {/* Mobile Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mobile Image (1080x1080px, square)
            </label>
            {formData.mobileImage && !mobileImageFile && (
              <p className="text-xs text-gray-500 mb-2">
                Current: {formData.mobileImage.substring(0, 50)}...
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {mobileImageFile && (
              <p className="text-sm text-green-600 mt-1">✓ {mobileImageFile.name}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : banner ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
