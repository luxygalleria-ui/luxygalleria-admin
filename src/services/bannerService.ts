import apiClient from './apiClient';

export interface Banner {
  _id?: string;
  title: string;
  description: string;
  image: string;
  mobileImage?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const bannerService = {
  // Get all banners
  async getBanners() {
    const response = await apiClient.get('/banners');
    return response.data;
  },

  // Create new banner
  async createBanner(data: FormData) {
    const response = await apiClient.post('/banners', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update banner
  async updateBanner(id: string, data: FormData) {
    const response = await apiClient.put(`/banners/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete banner
  async deleteBanner(id: string) {
    const response = await apiClient.delete(`/banners/${id}`);
    return response.data;
  },
};
