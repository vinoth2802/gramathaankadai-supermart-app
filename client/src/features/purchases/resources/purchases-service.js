import api from '@lib/api';

export const PurchasesAPI = {
  getAll:          ()                     => api.get('/purchases'),
  getById:         (id)                   => api.get(`/purchases/${id}`),
  getByDateRange:  (from, to)             => api.get('/purchases', { params: { from, to } }),
  searchByInvoice: (q)                    => api.get('/purchases', { params: { invoiceSearch: q } }),
  getByParty:      (partyId, partyName)   => api.get('/purchases', { params: { partyId, partyName } }),
  create:          (data)                 => api.post('/purchases', data),
  update:          (id, data)             => api.patch(`/purchases/${id}`, data),
  delete:          (id)                   => api.delete(`/purchases/${id}`),
};

export const PurchaseReturnsAPI = {
  getAll:      ()     => api.get('/purchase-returns'),
  getById:     (id)   => api.get(`/purchase-returns/${id}`),
  nextNumber:  ()     => api.get('/purchase-returns/next-number'),
  create:      (data) => api.post('/purchase-returns', data),
};
