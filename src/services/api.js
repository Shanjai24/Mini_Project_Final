// API Service Layer for Frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Auth API calls
export const authAPI = {
  login: async (email, password, name = null, role = 'Student') => {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, role }),
    });
    
    const data = await handleResponse(response);
    
    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getProfile: async () => {
    const token = getAuthToken();
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  deleteAccount: async () => {
    const token = getAuthToken();
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${API_BASE_URL}/api/delete-account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await handleResponse(response);
    authAPI.logout();
    return data;
  },
};

// Resume/HR API calls
export const resumeAPI = {
  matchResumes: async (formData) => {
    const token = getAuthToken();
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${API_BASE_URL}/api/match-resumes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    return handleResponse(response);
  },

  getUploadHistory: async () => {
    const token = getAuthToken();
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${API_BASE_URL}/api/upload-history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  getCandidates: async (uploadId) => {
    const token = getAuthToken();
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${API_BASE_URL}/api/candidates/${uploadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },
};

// Dashboard API calls
export const dashboardAPI = {
  getStats: async () => {
    const token = getAuthToken();
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${API_BASE_URL}/api/dashboard-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Get current user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
