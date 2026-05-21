import http from './client.js';

export const AccountsAPI = {
  getUOMs:      ()     => http.get('/accounts/uom'),
  saveUOM:      (data) => http.post('/accounts/uom', data),
  deleteUOM:    (id)   => http.delete(`/accounts/uom/${id}`),
  getCashOverview: ()         => http.get('/accounts/cash/overview'),
  getCash:         ()         => http.get('/accounts/cash'),
  saveCash:        (data)     => http.post('/accounts/cash', data),
  updateCash:      (id, data) => http.patch(`/accounts/cash/${id}`, data),
  deleteCash:      (id)       => http.delete(`/accounts/cash/${id}`),
  getBankAccounts:    ()         => http.get('/accounts/bank'),
  saveBankAccount:    (data)     => http.post('/accounts/bank', data),
  updateBankAccount:  (id, data) => http.put(`/accounts/bank/${id}`, data),
  deleteBankAccount:  (id)       => http.delete(`/accounts/bank/${id}`),
  bankTransfer:       (data)     => http.post('/accounts/bank/transfer', data),
  getBankTransactions:(id)       => http.get(`/accounts/bank/${id}/transactions`),
  getCheques:   ()     => http.get('/accounts/cheques'),
  saveCheque:   (data) => http.post('/accounts/cheques', data),
  updateCheque: (id, data) => http.patch(`/accounts/cheques/${id}`, data),
  getAuditLog:  ()     => http.get('/accounts/audit'),
  logAudit:     (data) => http.post('/accounts/audit', data),
};
