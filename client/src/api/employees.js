import http from './client.js';

export const EmployeesAPI = {
  getAll:  ()         => http.get('/employees'),
  getById: (id)       => http.get(`/employees/${id}`),
  create:  (data)     => http.post('/employees', data),
  update:  (id, data) => http.put(`/employees/${id}`, data),
  toggle:  (id)       => http.patch(`/employees/${id}/toggle`),
  delete:  (id)       => http.delete(`/employees/${id}`),
};
