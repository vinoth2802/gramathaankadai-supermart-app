import http from './client.js';

export const SettingsAPI = {
  get:  ()     => http.get('/settings'),
  save: (data) => http.put('/settings', data),

  getPrint:  ()     => http.get('/settings/print'),
  savePrint: (data) => http.put('/settings/print', data),

  getTax:  ()     => http.get('/settings/tax'),
  saveTax: (data) => http.put('/settings/tax', data),

  getTransaction:  ()     => http.get('/settings/transaction'),
  saveTransaction: (data) => http.put('/settings/transaction', data),

  getLoyalty:  ()     => http.get('/settings/loyalty'),
  saveLoyalty: (data) => http.put('/settings/loyalty', data),

  getParty:  ()     => http.get('/settings/party'),
  saveParty: (data) => http.put('/settings/party', data),

  getItem:  ()     => http.get('/settings/item'),
  saveItem: (data) => http.put('/settings/item', data),

  getUnit:  ()     => http.get('/settings/unit'),
  saveUnit: (data) => http.put('/settings/unit', data),
};
