import api from '@lib/api';

export const ExpensesAPI = {
  getAll:  ()           => api.get('/expenses'),
  create:  (data)       => api.post('/expenses', data),
  update:  (id, data)   => api.patch(`/expenses/${id}`, data),
  delete:  (id)         => api.delete(`/expenses/${id}`),
};

export const ExpenseCategoriesAPI = {
  getAll:  ()     => api.get('/expense-categories'),
  create:  (data) => api.post('/expense-categories', data),
  delete:  (id)   => api.delete(`/expense-categories/${id}`),
};
