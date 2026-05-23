import http from './client.js';

export const SalesAPI = {
  getAll:          ()           => http.get('/sales'),
  getById:         (id)         => http.get(`/sales/${id}`),
  getByDateRange:  (from, to)   => http.get('/sales', { params: { from, to } }),
  getNextNumber:   ()           => http.get('/sales/next-number'),
  searchByInvoice: (q)          => http.get('/sales', { params: { invoiceSearch: q } }),
  create:          (data)       => http.post('/sales', data),
  update:          (id, data)   => http.patch(`/sales/${id}`, data),
  delete:          (id)         => http.delete(`/sales/${id}`),
};
