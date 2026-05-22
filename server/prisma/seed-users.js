import prisma from '../src/db.js';
import bcrypt from 'bcrypt';

const ROLES = [
  { name: 'Owner',       description: 'Full access to everything',        isSystem: true },
  { name: 'Admin',       description: 'Manage all except owner settings',  isSystem: true },
  { name: 'Manager',     description: 'Manage sales, purchases, items',    isSystem: false },
  { name: 'Accountant',  description: 'Access accounts and reports',       isSystem: false },
  { name: 'Sales Staff', description: 'Create and view sales only',        isSystem: false },
  { name: 'Viewer',      description: 'Read-only access',                  isSystem: false },
];

const MODULES = ['sales', 'purchases', 'items', 'parties', 'reports', 'accounts', 'settings', 'users'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

async function seed() {
  console.log('Seeding roles...');
  for (const r of ROLES) {
    await prisma.appRole.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  console.log('Seeding permissions...');
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      await prisma.appPermission.upsert({
        where:  { module_action: { module, action } },
        update: {},
        create: { module, action, description: `${action} ${module}` },
      });
    }
  }

  // Owner gets all permissions
  console.log('Assigning Owner all permissions...');
  const owner = await prisma.appRole.findUnique({ where: { name: 'Owner' } });
  const allPerms = await prisma.appPermission.findMany();
  for (const p of allPerms) {
    await prisma.appRolePermission.upsert({
      where:  { roleId_permissionId: { roleId: owner.id, permissionId: p.id } },
      update: {},
      create: { roleId: owner.id, permissionId: p.id },
    });
  }

  // Create default Owner user if none exists
  console.log('Seeding default owner user...');
  const ownerRole = await prisma.appRole.findUnique({ where: { name: 'Owner' } });
  const existing  = await prisma.appUser.findUnique({ where: { email: 'admin@gramathaankadai.com' } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('1234', 10);
    await prisma.appUser.create({
      data: {
        name:         'Admin',
        email:        'admin@gramathaankadai.com',
        passwordHash,
        roleId:       ownerRole.id,
        isActive:     true,
      },
    });
    console.log('Default user created: admin@gramathaankadai.com / 1234');
  } else {
    console.log('Default user already exists, skipping.');
  }

  console.log('Done!');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
