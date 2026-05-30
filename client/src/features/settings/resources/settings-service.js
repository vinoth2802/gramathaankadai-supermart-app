import api from '@lib/api';

export const SettingsAPI = {
  get:              ()     => api.get('/settings'),
  save:             (data) => api.put('/settings', data),
  getPrint:         ()     => api.get('/settings/print'),
  savePrint:        (data) => api.put('/settings/print', data),
  getTax:           ()     => api.get('/settings/tax'),
  saveTax:          (data) => api.put('/settings/tax', data),
  getTransaction:   ()     => api.get('/settings/transaction'),
  saveTransaction:  (data) => api.put('/settings/transaction', data),
  getLoyalty:       ()     => api.get('/settings/loyalty'),
  saveLoyalty:      (data) => api.put('/settings/loyalty', data),
  getParty:         ()     => api.get('/settings/party'),
  saveParty:        (data) => api.put('/settings/party', data),
  getItem:          ()     => api.get('/settings/item'),
  saveItem:         (data) => api.put('/settings/item', data),
  getUnit:          ()     => api.get('/settings/unit'),
  saveUnit:         (data) => api.put('/settings/unit', data),
};
