import http from './client.js';

export const AttendanceAPI = {
  getByDate:      (date)                 => http.get('/attendance', { params: { date } }),
  getByEmployee:  (employeeId, month)    => http.get('/attendance', { params: { employeeId, month } }),
  getSummary:     (month)                => http.get('/attendance/summary', { params: { month } }),
  save:           (data)                 => http.post('/attendance', data),
  saveBulk:       (date, entries)        => http.post('/attendance/bulk', { date, entries }),
  delete:         (id)                   => http.delete(`/attendance/${id}`),
};
