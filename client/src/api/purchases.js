import http from './client.js';

export const PurchasesAPI = {
  getAll:            ()         => http.get('/purchases'),
  getById:           (id)       => http.get(`/purchases/${id}`),
  getByDateRange:    (from, to) => http.get('/purchases', { params: { from, to } }),
  searchByInvoice:   (q)        => http.get('/purchases', { params: { invoiceSearch: q } }),
  getByParty:        (partyId, partyName) => http.get('/purchases', { params: { partyId, partyName } }),
  create:            (data)     => http.post('/purchases', data),
  update:            (id, data) => http.patch(`/purchases/${id}`, data),
  delete:            (id)       => http.delete(`/purchases/${id}`),
};
