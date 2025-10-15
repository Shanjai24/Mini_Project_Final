import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post(API_ENDPOINTS.AUTH.LOGIN, credentials),
  register: (userData) => api.post(API_ENDPOINTS.AUTH.REGISTER, userData),
  getProfile: () => api.get(API_ENDPOINTS.AUTH.PROFILE),
};

// Resume API
export const resumeAPI = {
  uploadResume: (formData) => {
    return api.post(API_ENDPOINTS.RESUME.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  matchResume: (jobData) => api.post(API_ENDPOINTS.RESUME.MATCH, jobData),
  getCandidates: (uploadId) => 
    api.get(`${API_ENDPOINTS.RESUME.CANDIDATES}/${uploadId}`),
};

// ML API
export const mlAPI = {
  matchResumes: (formData) => {
    return axios.post(
      `${API_ENDPOINTS.ML_API.BASE_URL}${API_ENDPOINTS.ML_API.MATCH}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },
  getSupportedSkills: () => 
    axios.get(`${API_ENDPOINTS.ML_API.BASE_URL}${API_ENDPOINTS.ML_API.SKILLS}`),
};

export default api;
