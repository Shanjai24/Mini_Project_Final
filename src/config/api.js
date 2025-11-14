// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://miniprojectfinal-production.up.railway.app';

export const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'https://shanjai245-resume-matcher.hf.space';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/login',
    REGISTER: '/api/register',
    PROFILE: '/api/profile',
  },
  RESUME: {
    UPLOAD: '/api/upload',
    MATCH: '/api/match-resumes',
    CANDIDATES: '/api/candidates',
    HISTORY: '/api/upload-history',
  },
  DASHBOARD: {
    STATS: '/api/dashboard-stats',
  }
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
  { id: 3, label: "Bachelor's Degree" },
  { id: 4, label: "Master's Degree" },
  { id: 5, label: 'PhD' },
];