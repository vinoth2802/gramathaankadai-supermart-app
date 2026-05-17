import http from './client.js';

export const SettingsAPI = {
  get:  ()     => http.get('/settings'),
  save: (data) => http.put('/settings', data),
};
