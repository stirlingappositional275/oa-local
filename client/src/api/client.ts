/**
 * API Client
 * 
 * Axios instance with automatic JWT attachment and 401 interception.
 */

import axios from 'axios';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('oa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('oa_token');
      localStorage.removeItem('oa_user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ━━ Auth API ━━
export const authApi = {
  login: (code: string) => apiClient.post('/auth/login', { code }),
  me: () => apiClient.get('/auth/me'),
};

// ━━ Approval API ━━
export const approvalApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/approvals', { params }),
  listPending: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get('/approvals/pending', { params }),
  create: (data: {
    title: string;
    templateCode: string;
    formData: Record<string, any>;
    amount?: number;
    currency?: string;
    department?: string;
    entity?: string;
  }) => apiClient.post('/approvals', data),
  getById: (id: string) => apiClient.get(`/approvals/${id}`),
  update: (id: string, data: { title?: string; formData?: Record<string, any>; amount?: number }) =>
    apiClient.put(`/approvals/${id}`, data),
  approve: (id: string, comment?: string) =>
    apiClient.post(`/approvals/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) =>
    apiClient.post(`/approvals/${id}/reject`, { comment }),
};

// ━━ Template API ━━
export const templateApi = {
  list: () => apiClient.get('/templates'),
  create: (data: any) => apiClient.post('/templates', data),
};

// ━━ Search API ━━
export const searchApi = {
  search: (params: {
    q?: string;
    status?: string;
    entity?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get('/search', { params }),
};

// ━━ Export API ━━
export const exportApi = {
  exportData: async (filter: any) => {
    const response = await apiClient.post('/export', filter, {
      responseType: 'blob',
    });
    return response;
  },
};

export default apiClient;
