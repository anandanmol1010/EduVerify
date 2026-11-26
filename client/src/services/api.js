import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eduverify_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if invalid and on protected routes
      if (window.location.pathname.startsWith('/student') || 
          window.location.pathname.startsWith('/officer') || 
          window.location.pathname.startsWith('/admin')) {
        localStorage.removeItem('eduverify_token');
        localStorage.removeItem('eduverify_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
