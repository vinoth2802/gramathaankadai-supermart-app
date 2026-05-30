import api from '@lib/api';

export const PartiesAPI = {
  getAll:        ()             => api.get('/parties'),
  getById:       (id)           => api.get(`/parties/${id}`),
  create:        (data)         => api.post('/parties', data),
  update:        (id, data)     => api.put(`/parties/${id}`, data),
  save:          (data)         => data.id ? api.put(`/parties/${data.id}`, data) : api.post('/parties', data),
  delete:        (id)           => api.delete(`/parties/${id}`),
  updateBalance: (id, delta)    => api.patch(`/parties/${id}`, { balanceDelta: delta }),
  updatePayable: (id, delta)    => api.patch(`/parties/${id}`, { payableDelta: delta }),
};
