import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid auth state
      localStorage.removeItem('token');
      // Dispatch custom event for AuthContext to sync state
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// ─── API Services ────────────────────────────────────────────────────────────

// Reference Data
export const fetchItems = () => api.get('/api/reference/items').then(res => res.data.data.items);
export const fetchLocations = () => api.get('/api/reference/locations').then(res => res.data.data.locations);
export const fetchCategories = () => api.get('/api/reference/categories').then(res => res.data.data.categories);
export const fetchUsers = () => api.get('/api/reference/users').then(res => res.data.data.users);

// Inventory
export const fetchInventory = (params?: any) => api.get('/api/inventory', { params }).then(res => res.data.data.inventory);
export const createInventoryRecord = (data: any) => api.post('/api/inventory', data).then(res => res.data.data.inventory);
export const adjustStock = (id: string, data: any) => api.patch(`/api/inventory/${id}/adjust`, data).then(res => res.data.data.inventory);
export const fetchInventoryTransactions = (id: string) => api.get(`/api/inventory/${id}/transactions`).then(res => res.data.data.transactions);

// Work Orders
export const fetchWorkOrders = (params?: any) => api.get('/api/work-orders', { params }).then(res => res.data.data.workOrders);
export const createWorkOrder = (data: any) => api.post('/api/work-orders', data).then(res => res.data.data.workOrder);
export const updateWorkOrderStatus = (id: string, data: any) => api.patch(`/api/work-orders/${id}/status`, data).then(res => res.data.data.workOrder);
export const checkWorkOrderStock = (id: string) => api.get(`/api/work-orders/${id}/stock-check`).then(res => res.data.data);


