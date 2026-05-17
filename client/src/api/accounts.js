import http from './client.js';

export const AccountsAPI = {
  getUOMs:      ()     => http.get('/accounts/uom'),
  saveUOM:      (data) => http.post('/accounts/uom', data),
  deleteUOM:    (id)   => http.delete(`/accounts/uom/${id}`),
  getCash:      ()     => http.get('/accounts/cash'),
  saveCash:     (data) => http.post('/accounts/cash', data),
  getBankAccounts: ()  => http.get('/accounts/bank'),
  saveBankAccount: (data) => http.post('/accounts/bank', data),
  getCheques:   ()     => http.get('/accounts/cheques'),
  saveCheque:   (data) => http.post('/accounts/cheques', data),
  updateCheque: (id, data) => http.patch(`/accounts/cheques/${id}`, data),
  getAuditLog:  ()     => http.get('/accounts/audit'),
  logAudit:     (data) => http.post('/accounts/audit', data),
};
