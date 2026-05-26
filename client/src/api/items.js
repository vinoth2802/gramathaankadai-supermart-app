import http from './client.js';

export const ItemsAPI = {
  getAll:      ()         => http.get('/items'),
  search:      (q)        => http.get('/items', { params: { q } }),
  getById:     (id)       => http.get(`/items/${id}`),
  create:      (data)     => http.post('/items', data),
  update:      (id, data) => http.put(`/items/${id}`, data),
  save:        (data)     => data.id ? http.put(`/items/${data.id}`, data) : http.post('/items', data),
  delete:      (id)       => http.delete(`/items/${id}`),
  adjustStock: (id, delta) => http.patch(`/items/${id}`, { stockDelta: delta }),
  bulk:        (ids, data) => http.patch('/items/bulk', { ids, data }),
};
