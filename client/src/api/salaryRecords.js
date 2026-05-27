import http from './client.js';

export const SalaryRecordsAPI = {
  getAll:         (params)  => http.get('/salary-records', { params }),
  getByEmployee:  (empId)   => http.get('/salary-records', { params: { employeeId: empId } }),
  create:         (data)    => http.post('/salary-records', data),
  update:         (id, data)=> http.patch(`/salary-records/${id}`, data),
  delete:         (id)      => http.delete(`/salary-records/${id}`),
};
