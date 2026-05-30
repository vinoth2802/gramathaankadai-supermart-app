import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user.username) {
      config.headers['x-user'] = user.username;
    }

    if (user.tenantId) {
      config.headers['x-tenant-id'] = user.tenantId.toString();
    }
  } catch {}

  return config;
});

api.interceptors.response.use(
  (r) => r.data,
  (err) => Promise.reject(err.response?.data ?? err),
);

export default api;