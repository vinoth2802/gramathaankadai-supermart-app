import api from '@lib/api';

export const CashbookAPI = {
  getSummary: (date)       => api.get('/cashbook/summary', { params: { date } }),
  getHistory: (from, to)   => api.get('/cashbook/history', { params: { from, to } }),
};
