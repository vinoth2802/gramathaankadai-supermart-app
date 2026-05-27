import http from './client.js';

export const ExpensesAPI = {
  getAll:   (params) => http.get('/expenses', { params }),
  create:   (data)   => http.post('/expenses', data),
  update:   (id, data) => http.patch(`/expenses/${id}`, data),
  delete:   (id)     => http.delete(`/expenses/${id}`),
};
