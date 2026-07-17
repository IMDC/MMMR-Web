import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the session cookie on every request
});

apiClient.interceptors.response.use(
  res => res,
  err => {
    // Session expired / not logged in: bounce to login (except while checking session).
    const url: string = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/me') && !url.includes('/auth/login')) {
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    const message = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
