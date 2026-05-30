import api from '@lib/api';

export const AccountsAPI = {
  getUOMs:            ()           => api.get('/accounts/uom'),
  saveUOM:            (data)       => api.post('/accounts/uom', data),
  deleteUOM:          (id)         => api.delete(`/accounts/uom/${id}`),
  getCashOverview:    ()           => api.get('/accounts/cash/overview'),
  getCash:            ()           => api.get('/accounts/cash'),
  saveCash:           (data)       => api.post('/accounts/cash', data),
  updateCash:         (id, data)   => api.patch(`/accounts/cash/${id}`, data),
  deleteCash:         (id)         => api.delete(`/accounts/cash/${id}`),
  getBankAccounts:    ()           => api.get('/accounts/bank'),
  saveBankAccount:    (data)       => api.post('/accounts/bank', data),
  updateBankAccount:  (id, data)   => api.put(`/accounts/bank/${id}`, data),
  deleteBankAccount:  (id)         => api.delete(`/accounts/bank/${id}`),
  bankTransfer:       (data)       => api.post('/accounts/bank/transfer', data),
  getBankTransactions:(id)         => api.get(`/accounts/bank/${id}/transactions`),
  getCheques:         ()           => api.get('/accounts/cheques'),
  saveCheque:         (data)       => api.post('/accounts/cheques', data),
  updateCheque:       (id, data)   => api.patch(`/accounts/cheques/${id}`, data),
  getAuditLog:        ()           => api.get('/accounts/audit'),
  logAudit:           (data)       => api.post('/accounts/audit', data),
};

export const LoanAccountsAPI = {
  getAll:          ()           => api.get('/loan-accounts'),
  getById:         (id)         => api.get(`/loan-accounts/${id}`),
  create:          (data)       => api.post('/loan-accounts', data),
  remove:          (id)         => api.delete(`/loan-accounts/${id}`),
  getTransactions: (id)         => api.get(`/loan-accounts/${id}/transactions`),
  payment:         (id, data)   => api.post(`/loan-accounts/${id}/payments`, data),
  drawdown:        (id, data)   => api.post(`/loan-accounts/${id}/drawdowns`, data),
  charge:          (id, data)   => api.post(`/loan-accounts/${id}/charges`, data),
};

export const CapitalInvestmentsAPI = {
  getAll:  (type)       => api.get('/capital-investments', { params: type ? { type } : {} }),
  getById: (id)         => api.get(`/capital-investments/${id}`),
  create:  (data)       => api.post('/capital-investments', data),
  update:  (id, data)   => api.put(`/capital-investments/${id}`, data),
  remove:  (id)         => api.delete(`/capital-investments/${id}`),
};
