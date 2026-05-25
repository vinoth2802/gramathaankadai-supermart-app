import axios from 'axios';

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.username) config.headers['x-user'] = user.username;
  } catch {}
  return config;
});

http.interceptors.response.use(
  (r) => r.data,
  (err) => Promise.reject(err.response?.data ?? err)
);

export default http;
