import http from './client.js';

export const ReportsAPI = {
  billWiseProfit:   (from, to)   => http.get('/reports/bill-wise-profit', { params: { from, to } }),
  dayBook:          (date)       => http.get('/reports/day-book',         { params: { date } }),
  allTransactions:  (from, to)   => http.get('/reports/all-transactions', { params: { from, to } }),
};
