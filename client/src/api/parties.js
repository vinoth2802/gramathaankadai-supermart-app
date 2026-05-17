import http from './client.js';

export const PartiesAPI = {
  getAll:        ()               => http.get('/parties'),
  getById:       (id)             => http.get(`/parties/${id}`),
  create:        (data)           => http.post('/parties', data),
  update:        (id, data)       => http.put(`/parties/${id}`, data),
  save:          (data)           => data.id ? http.put(`/parties/${data.id}`, data) : http.post('/parties', data),
  delete:        (id)             => http.delete(`/parties/${id}`),
  updateBalance: (id, delta)      => http.patch(`/parties/${id}`, { balanceDelta: delta }),
  updatePayable: (id, delta)      => http.patch(`/parties/${id}`, { payableDelta: delta }),
};
