import http from './client.js';

export const PaymentsAPI = {
  getModes:         ()         => http.get('/payments/modes'),
  createMode:       (data)     => http.post('/payments/modes', data),
  deleteMode:       (id)       => http.delete(`/payments/modes/${id}`),
  getPaymentsIn:    ()         => http.get('/payments/in'),
  getPaymentIn:     (id)       => http.get(`/payments/in/${id}`),
  savePaymentIn:    (data)     => http.post('/payments/in', data),
  updatePaymentIn:  (id, data) => http.patch(`/payments/in/${id}`, data),
  deletePaymentIn:  (id)       => http.delete(`/payments/in/${id}`),
  getPaymentsOut:    ()         => http.get('/payments/out'),
  getPaymentOut:     (id)       => http.get(`/payments/out/${id}`),
  savePaymentOut:    (data)     => http.post('/payments/out', data),
  updatePaymentOut:  (id, data) => http.patch(`/payments/out/${id}`, data),
  deletePaymentOut:  (id)       => http.delete(`/payments/out/${id}`),
};
