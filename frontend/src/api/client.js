import axios from 'axios';
import { isTokenExpired } from '../utils/auth';

const baseURL =
  import.meta.env.VITE_API_GATEWAY_URL !== undefined
    ? import.meta.env.VITE_API_GATEWAY_URL
    : import.meta.env.DEV
    ? 'http://localhost:8000'
    : '';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Proactively checks expiry and injects JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');

  if (token) {
    if (isTokenExpired(token)) {
      // Proactively clean up and trigger logout if token expired
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      window.dispatchEvent(new Event('auth:session_expired'));
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Response Interceptor: Intercepts 401 Session Expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(localStorage.getItem('jwt_token'));
    const url = error.config?.url || '';

    if (error.response && error.response.status === 401 && hadToken && !url.includes('/api/v1/inventory')) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      window.dispatchEvent(new Event('auth:session_expired'));
    }

    return Promise.reject(error);
  }
);

export default api;
