import http from './client.js';

export const LoanAccountsAPI = {
  getAll:          ()          => http.get('/loan-accounts'),
  getById:         (id)        => http.get(`/loan-accounts/${id}`),
  create:          (data)      => http.post('/loan-accounts', data),
  remove:          (id)        => http.delete(`/loan-accounts/${id}`),
  getTransactions: (id)        => http.get(`/loan-accounts/${id}/transactions`),
  payment:         (id, data)  => http.post(`/loan-accounts/${id}/payments`, data),
  drawdown:        (id, data)  => http.post(`/loan-accounts/${id}/drawdowns`, data),
  charge:          (id, data)  => http.post(`/loan-accounts/${id}/charges`, data),
};
