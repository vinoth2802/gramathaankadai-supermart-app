import prisma from '../db.js';

// Resolves the active tenant for every /api request.
//   • Prefer a tenant cookie (set during login).
//   • Fall back to an `x-tenant-id` header for backward compatibility.
//   • Otherwise fall back to the default tenant (slug `gramathaankadai`),
//     so the existing single-shop client keeps working during the migration.
let cachedDefaultTenantId = null;

function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function resolveDefaultTenantId() {
  if (cachedDefaultTenantId != null) return cachedDefaultTenantId;
  const slug = process.env.DEFAULT_TENANT_SLUG || 'gramathaankadai';
  const tenant = await prisma.tenant.findFirst({ where: { slug }, select: { id: true } });
  cachedDefaultTenantId = tenant?.id ?? null;
  return cachedDefaultTenantId;
}

export async function tenantContext(req, res, next) {
  try {
    const isLogin = req.path === '/auth/login';
    const cookie = readCookie(req, 'tenant_id') || readCookie(req, 'tenantId');
    const header = req.headers['x-tenant-id'];
    let tenantId;
    if (cookie != null && cookie !== '') {
      try {
        tenantId = BigInt(cookie);
      } catch {
        return res.status(400).json({ error: 'Invalid tenant cookie' });
      }
    } else if (header != null && header !== '') {
      try {
        tenantId = BigInt(header);
      } catch {
        return res.status(400).json({ error: 'Invalid x-tenant-id header' });
      }
    } else if (isLogin) {
      req.tenantId = null;
      return next();
    } else {
      tenantId = await resolveDefaultTenantId();
    }
    if (tenantId == null) {
      return res.status(400).json({ error: 'No tenant context could be resolved' });
    }
    req.tenantId = tenantId;
    next();
  } catch (err) {
    console.error('tenantContext error:', err);
    res.status(500).json({ error: 'Failed to resolve tenant context' });
  }
}

export default tenantContext;
