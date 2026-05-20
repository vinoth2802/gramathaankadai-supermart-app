import http from './client.js';

export const CategoriesAPI = {
  getAll:  ()         => http.get('/categories'),
  create:  (data)     => http.post('/categories', data),
  update:  (id, data) => http.put(`/categories/${id}`, data),
  delete:  (id)       => http.delete(`/categories/${id}`),
};
