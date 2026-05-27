import http from './client.js';

export const DesignationsAPI = {
  getAll: ()     => http.get('/designations'),
  create: (name) => http.post('/designations', { name }),
  delete: (id)   => http.delete(`/designations/${id}`),
};
