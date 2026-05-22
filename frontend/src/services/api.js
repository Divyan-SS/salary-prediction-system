// frontend/src/services/api.js
import axios from 'axios';

// =================================================
// 🌍 API BASE (DYNAMIC WITH HARDCODED PRODUCTION FALLBACK)
// =================================================
const API_BASE = import.meta.env.VITE_API_URL || 'https://salary-backend-z83u.onrender.com';

// Remove trailing slash if it exists safely to prevent duplicate slash routing errors
const cleanBase = API_BASE.replace(/\/$/, '');

const api = axios.create({
  baseURL: cleanBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =================================================
// 📊 API FUNCTIONS
// =================================================

export const predictSalary = (data) =>
  api.post('/predict', data);

export const convertSalary = (original_salary_usd, target_currency) =>
  api.post('/convert-salary', null, {
    params: { original_salary_usd, target_currency },
  });

export const getSupportedCurrencies = () =>
  api.get('/currencies');

export const uploadCSV = (formData) =>
  api.post('/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const fetchAnalytics = () =>
  api.get('/analytics');

export const fetchFilteredAnalytics = (countries) =>
  api.post('/analytics/filter', { countries });

export default api;