import http from './client.js';

export const CapitalInvestmentsAPI = {
  getAll:   (type)      => http.get('/capital-investments', { params: type ? { type } : {} }),
  getById:  (id)        => http.get(`/capital-investments/${id}`),
  create:   (data)      => http.post('/capital-investments', data),
  update:   (id, data)  => http.put(`/capital-investments/${id}`, data),
  remove:   (id)        => http.delete(`/capital-investments/${id}`),
};
