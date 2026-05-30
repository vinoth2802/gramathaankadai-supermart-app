import api from '@lib/api';

export const ItemsAPI = {
  getAll:      ()            => api.get('/items'),
  search:      (q)           => api.get('/items', { params: { q } }),
  getById:     (id)          => api.get(`/items/${id}`),
  create:      (data)        => api.post('/items', data),
  update:      (id, data)    => api.put(`/items/${id}`, data),
  save:        (data)        => data.id ? api.put(`/items/${data.id}`, data) : api.post('/items', data),
  delete:      (id)          => api.delete(`/items/${id}`),
  adjustStock: (id, delta)   => api.patch(`/items/${id}`, { stockDelta: delta }),
  bulk:        (ids, data)   => api.patch('/items/bulk', { ids, data }),
};

export const CategoriesAPI = {
  getAll:  ()           => api.get('/categories'),
  create:  (data)       => api.post('/categories', data),
  update:  (id, data)   => api.put(`/categories/${id}`, data),
  delete:  (id)         => api.delete(`/categories/${id}`),
};

export const UnitsAPI = {
  getAll:            ()           => api.get('/units'),
  create:            (data)       => api.post('/units', data),
  update:            (id, data)   => api.put(`/units/${id}`, data),
  delete:            (id)         => api.delete(`/units/${id}`),
  getConversions:    (id)         => api.get(`/units/${id}/conversions`),
  createConversion:  (data)       => api.post('/units/conversions', data),
  deleteConversion:  (id)         => api.delete(`/units/conversions/${id}`),
};
