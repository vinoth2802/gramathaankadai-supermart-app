import api from '@lib/api';

export const SalesAPI = {
  getAll:          ()           => api.get('/sales'),
  getById:         (id)         => api.get(`/sales/${id}`),
  getByDateRange:  (from, to)   => api.get('/sales', { params: { from, to } }),
  getNextNumber:   ()           => api.get('/sales/next-number'),
  searchByInvoice: (q)          => api.get('/sales', { params: { invoiceSearch: q } }),
  getByParty:      (partyId)    => api.get('/sales', { params: { partyId } }),
  create:          (data)       => api.post('/sales', data),
  update:          (id, data)   => api.patch(`/sales/${id}`, data),
  delete:          (id)         => api.delete(`/sales/${id}`),
};

export const SaleReturnsAPI = {
  getAll:     (params) => api.get('/sale-returns', { params }),
  getById:    (id)     => api.get(`/sale-returns/${id}`),
  nextNumber: ()       => api.get('/sale-returns/next-number'),
  create:     (data)   => api.post('/sale-returns', data),
};

export const EstimatesAPI = {
  getAll:        (params)   => api.get('/estimates', { params }),
  getNextNumber: ()         => api.get('/estimates/next-number'),
  getById:       (id)       => api.get(`/estimates/${id}`),
  create:        (data)     => api.post('/estimates', data),
  update:        (id, data) => api.patch(`/estimates/${id}`, data),
  delete:        (id)       => api.delete(`/estimates/${id}`),
  convert:       (id, type) => api.post(`/estimates/${id}/convert`, { type }),
};
