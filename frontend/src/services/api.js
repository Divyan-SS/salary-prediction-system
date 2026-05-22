// frontend/src/services/api.js
import axios from 'axios';

// =================================================
// 🌍 API BASE (DYNAMIC WITH HARDCODED PRODUCTION FALLBACK)
// =================================================
const API_BASE = import.meta.env.VITE_API_URL || 'https://salary-backend-z83u.onrender.com';

// Remove trailing slash if it exists safely
const cleanBase = API_BASE.replace(/\/$/, '');

const api = axios.create({
  baseURL: cleanBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =================================================
// 📊 API FUNCTIONS (🌟 SYNCED WITH /api ROUTE PREFIX)
// =================================================

export const predictSalary = (data) =>
  api.post('/api/predict', data);

export const convertSalary = (original_salary_usd, target_currency) =>
  api.post('/api/convert-salary', null, {
    params: { original_salary_usd, target_currency },
  });

export const getSupportedCurrencies = () =>
  api.get('/api/currencies');

export const uploadCSV = (formData) =>
  api.post('/api/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const fetchAnalytics = () =>
  api.get('/api/analytics');

export const fetchFilteredAnalytics = (countries) =>
  api.post('/api/analytics/filter', { countries });

export default api;