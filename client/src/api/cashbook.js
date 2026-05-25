import http from './client.js';

export const CashbookAPI = {
  getSummary: (date)         => http.get('/cashbook/summary', { params: { date } }),
  getHistory: (from, to)     => http.get('/cashbook/history', { params: { from, to } }),
};
