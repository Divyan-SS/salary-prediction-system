import axios from 'axios';

// Ensure we handle environment variables correctly for Vite
const API_BASE = import.meta.env.VITE_API_URL || 'https://salary-backend-z83u.onrender.com';

const api = axios.create({
  baseURL: API_BASE.replace(/\/$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to debug the 404
api.interceptors.request.use(config => {
  console.log(`📡 Sending request to: ${config.baseURL}${config.url}`);
  return config;
});

export const predictSalary = (data) => api.post('/api/predict', data);
export const convertSalary = (original_salary_usd, target_currency) =>
  api.post('/api/convert-salary', null, { params: { original_salary_usd, target_currency } });
export const getSupportedCurrencies = () => api.get('/api/currencies');
export const uploadCSV = (formData) => api.post('/api/upload-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const fetchAnalytics = () => api.get('/api/analytics');
export const fetchFilteredAnalytics = (countries) => api.post('/api/analytics/filter', { countries });

export default api;