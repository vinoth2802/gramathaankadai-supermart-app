import api from '@lib/api';

export const RecycleBinAPI = {
  getAll:      ()   => api.get('/recycle-bin'),
  restore:     (id) => api.post(`/recycle-bin/${id}/restore`),
  deletePerm:  (id) => api.delete(`/recycle-bin/${id}`),
  deleteAll:   ()   => api.delete('/recycle-bin'),
};

export const ActivityLogAPI = {
  getAll:   () => api.get('/activity-log'),
  clearAll: () => api.delete('/activity-log'),
};
