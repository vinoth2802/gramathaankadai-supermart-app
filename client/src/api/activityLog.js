import http from './client.js';

export const ActivityLogAPI = {
  getAll:   (params) => http.get('/activity-log', { params }),
  clearAll: ()       => http.delete('/activity-log'),
};
