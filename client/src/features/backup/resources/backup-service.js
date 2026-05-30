import api from '@lib/api';

export const BackupAPI = {
  list:         ()           => api.get('/backup/list'),
  create:       ()           => api.post('/backup/create'),
  delete:       (filename)   => api.delete(`/backup/${filename}`),
  getSettings:  ()           => api.get('/backup/settings'),
  saveSettings: (data)       => api.put('/backup/settings', data),
  downloadUrl:  (filename)   => `/api/backup/download/${filename}`,
};
