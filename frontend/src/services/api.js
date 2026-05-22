import axios from 'axios';

// =================================================
// 🌍 API BASE (WORKS IN LOCAL + VERCEL + RENDER)
// =================================================
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// Remove trailing slash if it exists safely
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