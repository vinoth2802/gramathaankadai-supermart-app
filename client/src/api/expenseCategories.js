import http from './client.js';

export const ExpenseCategoriesAPI = {
  getAll: ()           => http.get('/expense-categories'),
  create: (data)       => http.post('/expense-categories', data),
  delete: (id)         => http.delete(`/expense-categories/${id}`),
};
