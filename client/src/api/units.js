import http from './client.js';

export const UnitsAPI = {
  getAll:           ()         => http.get('/units'),
  create:           (data)     => http.post('/units', data),
  update:           (id, data) => http.put(`/units/${id}`, data),
  delete:           (id)       => http.delete(`/units/${id}`),
  getConversions:   (id)       => http.get(`/units/${id}/conversions`),
  createConversion: (data)     => http.post('/units/conversions', data),
  deleteConversion: (id)       => http.delete(`/units/conversions/${id}`),
};
