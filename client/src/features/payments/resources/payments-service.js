import api from '@lib/api';

export const PaymentsAPI = {
  getModes:        ()           => api.get('/payments/modes'),
  getOptions:      ()           => api.get('/payments/options'),
  createMode:      (data)       => api.post('/payments/modes', data),
  deleteMode:      (id)         => api.delete(`/payments/modes/${id}`),
  getPaymentsIn:   ()           => api.get('/payments/in'),
  getPaymentIn:    (id)         => api.get(`/payments/in/${id}`),
  savePaymentIn:   (data)       => api.post('/payments/in', data),
  updatePaymentIn: (id, data)   => api.patch(`/payments/in/${id}`, data),
  deletePaymentIn: (id)         => api.delete(`/payments/in/${id}`),
  getPaymentsOut:  ()           => api.get('/payments/out'),
  getPaymentOut:   (id)         => api.get(`/payments/out/${id}`),
  savePaymentOut:  (data)       => api.post('/payments/out', data),
  updatePaymentOut:(id, data)   => api.patch(`/payments/out/${id}`, data),
  deletePaymentOut:(id)         => api.delete(`/payments/out/${id}`),
};
