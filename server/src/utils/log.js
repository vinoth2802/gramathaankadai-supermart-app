import prisma from '../db.js';

// Tenant-aware activity logger. Writes to the v2 `audit_log` table.
// `tenantId` (BigInt) is optional but should be passed from req.tenantId.
export function logActivity({ action, type, refNo, partyName, amount, userName, changes, tenantId, userId }) {
  prisma.auditLog.create({
    data: {
      tenantId:   tenantId ?? null,
      userId:     userId ?? null,
      userName:   userName || null,
      action,
      entityType: type || null,
      details: {
        type:      type       || null,
        refNo:     refNo      || null,
        partyName: partyName  || null,
        amount:    amount != null ? Number(amount) : 0,
        changes:   changes?.length ? changes : null,
      },
    },
  }).catch(() => {});
}

// Returns [{field, from, to}] for every field whose formatted value changed.
export function computeDiff(before, after, fields) {
  if (!before || !after) return [];
  return fields.reduce((acc, { key, label, format }) => {
    const fmt = format || (v => v == null ? '—' : String(v));
    const oldStr = fmt(before[key]);
    const newStr = fmt(after[key]);
    if (oldStr !== newStr) acc.push({ field: label, from: oldStr, to: newStr });
    return acc;
  }, []);
}
