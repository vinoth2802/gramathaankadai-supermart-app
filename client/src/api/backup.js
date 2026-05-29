import http from './client.js';

export const BackupAPI = {
  list:           ()           => http.get('/backup/list'),
  create:         ()           => http.post('/backup/create'),
  delete:         (filename)   => http.delete(`/backup/${filename}`),
  getSettings:    ()           => http.get('/backup/settings'),
  saveSettings:   (data)       => http.put('/backup/settings', data),
  downloadUrl:    (filename)   => `/api/backup/download/${filename}`,
};
