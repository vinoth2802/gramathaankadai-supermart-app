// ============================================================
// src/api/purchases.api.js
// All purchase history data access — /purchaseHistory
// ============================================================

const PurchasesAPI = {
  async getAll()        { return APIClient.get('/purchaseHistory'); },
  async getById(id)     { return APIClient.get(`/purchaseHistory/${id}`); },
  async create(record)  { return APIClient.post('/purchaseHistory', record); },

  async getByDateRange(fromDate, toDate) {
    const all = await this.getAll();
    return all.filter(p => {
      const d = new Date(p.date.split(',')[0]);
      return d >= fromDate && d <= toDate;
    });
  },

  async getTotalSpend() {
    const all = await this.getAll();
    return all.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
  }
};

window.PurchasesAPI = PurchasesAPI;
