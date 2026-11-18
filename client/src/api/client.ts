import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lexusmail_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-clear on download password challenge
      if (!error.config.url.includes('/download/')) {
        // Token expired or invalid
        // localStorage.removeItem('lexusmail_token');
      }
    }
    return Promise.reject(error);
  }
);
