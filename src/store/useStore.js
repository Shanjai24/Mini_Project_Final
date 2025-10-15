import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

export const useStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      isAuthenticated: false,
      
      // Job prediction state
      jobPredictions: [],
      currentPrediction: null,
      
      // UI state
      isLoading: false,
      theme: 'dark',
      
      // Actions
      setUser: (user) => {
        // Also update localStorage when setting user
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({ user, isAuthenticated: !!user });
      },
      logout: () => {
        // Clear localStorage on logout
        authAPI.logout();
        set({ user: null, isAuthenticated: false });
      },
      
      setJobPredictions: (predictions) => set({ jobPredictions: predictions }),
      addJobPrediction: (prediction) => set((state) => ({
        jobPredictions: [...state.jobPredictions, prediction]
      })),
      
      setCurrentPrediction: (prediction) => set({ currentPrediction: prediction }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
      
      // Computed values
      getPredictionById: (id) => {
        const state = get();
        return state.jobPredictions.find(p => p.id === id);
      },
      
      getRecentPredictions: (limit = 5) => {
        const state = get();
        return state.jobPredictions
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, limit);
      }
    }),
    {
      name: 'ai-job-predictor-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        jobPredictions: state.jobPredictions,
        theme: state.theme
      })
    }
  )
);
