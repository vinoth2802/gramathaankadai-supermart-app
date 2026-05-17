// ============================================================
// src/api/payments.api.js
// Payment modes, payment-in, payment-out — async HTTP
// ============================================================

const PaymentsAPI = {
  // ── Payment Modes ─────────────────────────────────────────
  async getModes()       { return APIClient.get('/paymentModes'); },
  async saveMode(mode)   {
    return mode.id ? APIClient.put(`/paymentModes/${mode.id}`, mode)
                   : APIClient.post('/paymentModes', mode);
  },
  async deleteMode(id)   { return APIClient.delete(`/paymentModes/${id}`); },

  // ── Payment In ────────────────────────────────────────────
  async getPaymentsIn()        { return APIClient.get('/paymentInHistory'); },
  async savePaymentIn(record)  { return APIClient.post('/paymentInHistory', record); },

  // ── Payment Out ───────────────────────────────────────────
  async getPaymentsOut()       { return APIClient.get('/paymentOutHistory'); },
  async savePaymentOut(record) { return APIClient.post('/paymentOutHistory', record); }
};

window.PaymentsAPI = PaymentsAPI;
