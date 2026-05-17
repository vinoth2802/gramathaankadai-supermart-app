import http from './client.js';

export const PurchasesAPI = {
  getAll:         ()         => http.get('/purchases'),
  getById:        (id)       => http.get(`/purchases/${id}`),
  getByDateRange: (from, to) => http.get('/purchases', { params: { from, to } }),
  create:         (data)     => http.post('/purchases', data),
  delete:         (id)       => http.delete(`/purchases/${id}`),
};
