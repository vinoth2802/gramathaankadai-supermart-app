import api from '@lib/api';

export const ReportsAPI = {
  billWiseProfit:  (from, to) => api.get('/reports/bill-wise-profit', { params: { from, to } }),
  dayBook:         (date)     => api.get('/reports/day-book',         { params: { date } }),
  allTransactions: (from, to) => api.get('/reports/all-transactions', { params: { from, to } }),
};
