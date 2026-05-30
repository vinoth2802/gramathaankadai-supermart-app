import api from '@lib/api';

export const EmployeesAPI = {
  getAll:  ()           => api.get('/employees'),
  getById: (id)         => api.get(`/employees/${id}`),
  create:  (data)       => api.post('/employees', data),
  update:  (id, data)   => api.put(`/employees/${id}`, data),
  toggle:  (id)         => api.patch(`/employees/${id}/toggle`),
  delete:  (id)         => api.delete(`/employees/${id}`),
};

export const DesignationsAPI = {
  getAll:  ()     => api.get('/designations'),
  create:  (name) => api.post('/designations', { name }),
  delete:  (id)   => api.delete(`/designations/${id}`),
};

export const AttendanceAPI = {
  getByDate:     (date)                => api.get('/attendance', { params: { date } }),
  getByEmployee: (employeeId, month)   => api.get('/attendance', { params: { employeeId, month } }),
  getSummary:    (month)               => api.get('/attendance/summary', { params: { month } }),
  save:          (data)                => api.post('/attendance', data),
  saveBulk:      (date, entries)       => api.post('/attendance/bulk', { date, entries }),
  delete:        (id)                  => api.delete(`/attendance/${id}`),
};

export const LeaveTypesAPI = {
  getAll:  ()           => api.get('/leave-types'),
  create:  (data)       => api.post('/leave-types', data),
  update:  (id, data)   => api.put(`/leave-types/${id}`, data),
  delete:  (id)         => api.delete(`/leave-types/${id}`),
};

export const LeaveRequestsAPI = {
  getAll:       (params)           => api.get('/leave-requests', { params }),
  getBalance:   (employeeId, year) => api.get('/leave-requests/balance', { params: { employeeId, year } }),
  create:       (data)             => api.post('/leave-requests', data),
  updateStatus: (id, data)         => api.patch(`/leave-requests/${id}/status`, data),
  delete:       (id)               => api.delete(`/leave-requests/${id}`),
};

export const SalaryRecordsAPI = {
  getAll:        (params) => api.get('/salary-records', { params }),
  getByEmployee: (empId)  => api.get('/salary-records', { params: { employeeId: empId } }),
  create:        (data)   => api.post('/salary-records', data),
  update:        (id, data) => api.patch(`/salary-records/${id}`, data),
  bulkUpdate:    (data)   => api.patch('/salary-records/bulk', data),
  delete:        (id)     => api.delete(`/salary-records/${id}`),
};
