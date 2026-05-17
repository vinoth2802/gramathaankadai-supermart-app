import axios from 'axios';

const http = axios.create({ baseURL: '/api' });

http.interceptors.response.use(
  (r) => r.data,
  (err) => Promise.reject(err.response?.data ?? err)
);

export default http;
