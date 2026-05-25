import http from './client.js';

export const RecycleBinAPI = {
  getAll:        ()   => http.get('/recycle-bin'),
  restore:       (id) => http.post(`/recycle-bin/${id}/restore`),
  deletePerm:    (id) => http.delete(`/recycle-bin/${id}`),
  deleteAll:     ()   => http.delete('/recycle-bin'),
};
