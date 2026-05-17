// ============================================================
// src/api/sales.api.js
// All sales history data access — /salesHistory
// ============================================================

const SalesAPI = {
  async getAll()        { return APIClient.get('/salesHistory'); },
  async getById(id)     { return APIClient.get(`/salesHistory/${id}`); },
  async create(record)  { return APIClient.post('/salesHistory', record); },
  async delete(id)      { return APIClient.delete(`/salesHistory/${id}`); },

  async getByDateRange(fromDate, toDate) {
    const all = await this.getAll();
    return all.filter(s => {
      const d = new Date(s.date.split(',')[0]);
      return d >= fromDate && d <= toDate;
    });
  },

  async getTodayTotal() {
    const today = new Date().toISOString().split('T')[0];
    const all   = await this.getAll();
    return all
      .filter(s => s.date && s.date.includes(today))
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  },

  async getTotalRevenue() {
    const all = await this.getAll();
    return all.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  }
};

window.SalesAPI = SalesAPI;
