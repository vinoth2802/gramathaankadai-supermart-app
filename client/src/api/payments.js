import http from './client.js';

export const PaymentsAPI = {
  getModes:      ()     => http.get('/payments/modes'),
  createMode:    (data) => http.post('/payments/modes', data),
  deleteMode:    (id)   => http.delete(`/payments/modes/${id}`),
  getPaymentsIn: ()     => http.get('/payments/in'),
  savePaymentIn: (data) => http.post('/payments/in', data),
  getPaymentsOut: ()    => http.get('/payments/out'),
  savePaymentOut: (data) => http.post('/payments/out', data),
};
