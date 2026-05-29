import http from './client.js';

export const LeaveTypesAPI = {
  getAll:  ()           => http.get('/leave-types'),
  create:  (data)       => http.post('/leave-types', data),
  update:  (id, data)   => http.put(`/leave-types/${id}`, data),
  delete:  (id)         => http.delete(`/leave-types/${id}`),
};
