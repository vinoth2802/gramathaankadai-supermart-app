import http from './client.js';

export const LeaveRequestsAPI = {
  getAll:       (params)            => http.get('/leave-requests', { params }),
  getBalance:   (employeeId, year)  => http.get('/leave-requests/balance', { params: { employeeId, year } }),
  create:       (data)              => http.post('/leave-requests', data),
  updateStatus: (id, data)          => http.patch(`/leave-requests/${id}/status`, data),
  delete:       (id)                => http.delete(`/leave-requests/${id}`),
};
