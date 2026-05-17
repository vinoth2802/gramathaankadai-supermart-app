// ============================================================
// src/api/parties.api.js
// All party data access — talks to json-server /parties
// ============================================================

const PartiesAPI = {
  async getAll()      { return APIClient.get('/parties'); },
  async getById(id)   { return APIClient.get(`/parties/${id}`); },
  async create(party) { return APIClient.post('/parties', party); },
  async update(party) { return APIClient.put(`/parties/${party.id}`, party); },
  async delete(id)    { return APIClient.delete(`/parties/${id}`); },

  async save(party) {
    return party.id ? this.update(party) : this.create(party);
  },

  async updateBalance(id, delta, field = 'balance') {
    const party = await this.getById(id);
    party[field] = (party[field] || 0) + delta;
    return this.update(party);
  }
};

window.PartiesAPI = PartiesAPI;

// Legacy shim — kept so any old inline script calling getParties() still works
window.getParties  = () => PartiesAPI.getAll();
window.saveParties = async (list) => {
  // Bulk replace: delete all then re-insert (only used by import)
  const existing = await PartiesAPI.getAll();
  await Promise.all(existing.map(p => PartiesAPI.delete(p.id)));
  await Promise.all(list.map(p => PartiesAPI.create(p)));
};
