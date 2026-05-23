import http from './client.js';

export const SaleReturnsAPI = {
  getAll:      (params) => http.get('/sale-returns', { params }),
  getById:     (id)     => http.get(`/sale-returns/${id}`),
  nextNumber:  ()       => http.get('/sale-returns/next-number'),
  create:      (data)   => http.post('/sale-returns', data),
};
