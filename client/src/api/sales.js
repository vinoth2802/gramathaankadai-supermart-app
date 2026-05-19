import http from './client.js';

export const SalesAPI = {
  getAll:          ()           => http.get('/sales'),
  getById:         (id)         => http.get(`/sales/${id}`),
  getByDateRange:  (from, to)   => http.get('/sales', { params: { from, to } }),
  create:          (data)       => http.post('/sales', data),
  update:          (id, data)   => http.patch(`/sales/${id}`, data),
  delete:          (id)         => http.delete(`/sales/${id}`),
};
