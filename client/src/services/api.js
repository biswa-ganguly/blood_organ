import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify/${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
};

// Donor APIs
export const donorAPI = {
  createProfile: (data) => api.post('/donors', data),
  getDonors: (params) => api.get('/donors', { params }),
  getDonorById: (id) => api.get(`/donors/${id}`),
  updateProfile: (id, data) => api.put(`/donors/${id}`, data),
  updateAvailability: (id, data) => api.patch(`/donors/${id}/availability`, data),
  getDonationHistory: (id) => api.get(`/donors/${id}/history`),
  addDonationRecord: (id, data) => api.post(`/donors/${id}/donation`, data),
  createDonationRequest: (data) => api.post('/requests', data),
};

// Hospital APIs
export const hospitalAPI = {
  createProfile: (data) => api.post('/hospitals', data),
  getHospitals: () => api.get('/hospitals'),
  getHospitalById: (id) => api.get(`/hospitals/${id}`),
  updateProfile: (id, data) => api.put(`/hospitals/${id}`, data),
  updateCapacity: (id, data) => api.patch(`/hospitals/${id}/capacity`, data),
  findNearbyHospitals: (params) => api.get('/hospitals/search/nearby', { params }),
  getRequests: () => api.get('/requests'),
  updateRequestStatus: (requestId, status) => api.patch(`/requests/${requestId}/status`, { status }),
  searchHospitals: (params) => api.get('/hospitals/search', { params })
};

export default api; 