import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT Token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global unified error handling natively protecting against expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend actively shreds the token or it expired, force emergency logout
    if (error.response?.status === 401) {
      // In a more complex architecture we'd silently try to use the refreshToken here.
      // For this workflow, forcing re-authentication keeps the design pure and simple.
      useAuthStore.getState().logout();

      // Gracefully redirect unauthenticated sessions exclusively if we are inside the client window
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
