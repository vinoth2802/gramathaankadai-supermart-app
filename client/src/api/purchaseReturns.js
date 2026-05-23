import http from './client.js';

export const PurchaseReturnsAPI = {
  getAll:     (params) => http.get('/purchase-returns', { params }),
  getById:    (id)     => http.get(`/purchase-returns/${id}`),
  nextNumber: ()       => http.get('/purchase-returns/next-number'),
  create:     (data)   => http.post('/purchase-returns', data),
};
