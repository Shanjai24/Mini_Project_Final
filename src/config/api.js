// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/login',
    REGISTER: '/api/register',
    PROFILE: '/api/profile',
  },
  RESUME: {
    UPLOAD: '/api/upload',
    MATCH: '/api/match',
    CANDIDATES: '/api/candidates',
  },
  ML_API: {
    BASE_URL: process.env.REACT_APP_ML_API_URL || 'http://localhost:8000',
    MATCH: '/match',
    SKILLS: '/skills',
  },
};

export const ROLES = {
  ADMIN: 'admin',
  RECRUITER: 'recruiter',
  CANDIDATE: 'candidate',
};

export const EDUCATION_LEVELS = [
  { id: 0, label: 'No Formal Education' },
  { id: 1, label: 'Certificate' },
  { id: 2, label: 'Diploma' },
  { id: 3, label: 'Bachelor\'s Degree' },
  { id: 4, label: 'Master\'s Degree' },
  { id: 5, label: 'PhD' },
];
