import http from './client.js';

export const EstimatesAPI = {
  getAll:        (params)     => http.get('/estimates', { params }).then(r => r.data),
  getNextNumber: ()           => http.get('/estimates/next-number').then(r => r.data),
  getById:       (id)         => http.get(`/estimates/${id}`).then(r => r.data),
  create:        (data)       => http.post('/estimates', data).then(r => r.data),
  update:        (id, data)   => http.patch(`/estimates/${id}`, data).then(r => r.data),
  delete:        (id)         => http.delete(`/estimates/${id}`).then(r => r.data),
  convert:       (id, type)   => http.post(`/estimates/${id}/convert`, { type }).then(r => r.data),
};
