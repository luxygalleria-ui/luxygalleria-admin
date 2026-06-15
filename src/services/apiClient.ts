import axios from 'axios';

const normalizeUrl = (url: string): string => url.trim().replace(/\/+$|^\s+|\s+$/g, '');

export const getBackendRoot = (rawUrl?: string): string => {
  const url = normalizeUrl(rawUrl ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000');
  return url.replace(/\/api(\/v1)?$|\/v1$/i, '');
};

export const getApiBaseUrl = (rawUrl?: string): string => {
  const url = normalizeUrl(rawUrl ?? process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5000');

  if (/\/api\/v1$/i.test(url)) return url;
  if (/\/api$/i.test(url)) return `${url}/v1`;
  if (/\/v1$/i.test(url)) return url;
  return `${url}/api/v1`;
};

// Create an Axios instance for frontend API calls to the external backend
const rawBackendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
const BACKEND_BASE = getApiBaseUrl(rawBackendUrl);
const apiClient = axios.create({
  baseURL: BACKEND_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    // Attach the token from localStorage before each request
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
