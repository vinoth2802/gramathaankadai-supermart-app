// ============================================================
// src/api/accounts.api.js
// Cash transactions, cheques, UOM — async HTTP
// ============================================================

const AccountsAPI = {
  // ── Cash transactions ─────────────────────────────────────
  async getCashTransactions()   { return APIClient.get('/cashTransactions'); },
  async saveCashTransaction(tx) { return APIClient.post('/cashTransactions', tx); },

  async getCashBalance() {
    const all = await this.getCashTransactions();
    return all.reduce((bal, tx) => bal + (tx.type === 'in' ? tx.amount : -tx.amount), 0);
  },

  // ── Cheques ───────────────────────────────────────────────
  async getCheques()        { return APIClient.get('/cheques'); },
  async saveCheque(cheque)  { return APIClient.post('/cheques', cheque); },
  async updateCheque(cheque){ return APIClient.put(`/cheques/${cheque.id}`, cheque); },

  // ── UOM ───────────────────────────────────────────────────
  async getUOMs()      { return APIClient.get('/uomList'); },
  async saveUOM(uom)   {
    return uom.id ? APIClient.put(`/uomList/${uom.id}`, uom)
                  : APIClient.post('/uomList', uom);
  },
  async deleteUOM(id)  { return APIClient.delete(`/uomList/${id}`); }
};

window.AccountsAPI = AccountsAPI;
