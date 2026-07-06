import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (payload) => api.post('/auth/login', payload);
export const register = (payload) => api.post('/auth/register', payload);
export const me = () => api.get('/auth/me');
export const googleLogin = (payload) => api.post('/auth/google', payload);
export const forgotPassword = (payload) => api.post('/auth/forgot-password', payload);
export const verifyOtp = (payload) => api.post('/auth/verify-otp', payload);
export const resetPassword = (payload) => api.post('/auth/reset-password', payload);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);
export const aiChat = (payload) => api.post('/ai/chat', payload);
export const cropRecommend = (payload) => api.post('/crops/recommend', payload);
export const detectDisease = (formData) => api.post('/disease/detect', formData);
export const weatherForecast = (payload) => api.post('/weather/forecast', payload);
export const irrigationPredict = (payload) => api.post('/irrigation/predict', payload);
export const fertilizerRecommend = (payload) => api.post('/fertilizer/recommend', payload);
export const marketPrices = (payload) => api.post('/market/prices', payload);
export const schemeRecommend = (payload) => api.post('/schemes/recommend', payload);
export const knowledgeRecommend = (payload) => api.post('/knowledge/recommend', payload);
export const listRecords = (module) => api.get(`/${module}`);
export const createRecord = (module, payload) => api.post(`/${module}`, payload);
export const updateRecord = (module, id, payload) => api.put(`/${module}/${id}`, payload);
export const deleteRecord = (module, id) => api.delete(`/${module}/${id}`);
export const adminUsers = (search = '') => api.get('/admin/users', { params: { search } });
export const adminCreateUser = (payload) => api.post('/admin/users', payload);
export const adminUpdateUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`);
export const adminRecords = (module, search = '') => api.get(`/admin/records/${module}`, { params: { search } });
export const adminCreateRecord = (module, payload) => api.post(`/admin/records/${module}`, payload);
export const adminUpdateRecord = (module, id, payload) => api.put(`/admin/records/${module}/${id}`, payload);
export const adminDeleteRecord = (module, id) => api.delete(`/admin/records/${module}/${id}`);
export const adminAnalytics = () => api.get('/admin/analytics');

export default api;
