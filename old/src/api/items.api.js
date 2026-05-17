// ============================================================
// src/api/items.api.js
// All product / inventory item data access — /products
// ============================================================

const ItemsAPI = {
  async getAll()      { return APIClient.get('/products'); },
  async getById(id)   { return APIClient.get(`/products/${id}`); },
  async create(item)  { return APIClient.post('/products', item); },
  async update(item)  { return APIClient.put(`/products/${item.id}`, item); },
  async delete(id)    { return APIClient.delete(`/products/${id}`); },

  async save(item) {
    return item.id ? this.update(item) : this.create(item);
  },

  async adjustStock(id, delta) {
    const item = await this.getById(id);
    item.stock = (item.stock || 0) + delta;
    return this.update(item);
  },

  async getLowStock(threshold = 5) {
    const all = await this.getAll();
    return all.filter(p => (p.stock || 0) < threshold);
  },

  async getReorderAlerts() {
    const all = await this.getAll();
    return all.filter(p => (p.stock || 0) <= (p.reorderLevel || 10));
  }
};

window.ItemsAPI = ItemsAPI;
