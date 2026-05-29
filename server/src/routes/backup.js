import { Router } from 'express';
import prisma from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR  = path.join(__dirname, '../../backups');
const CONFIG_FILE = path.join(__dirname, '../../backup-config.json');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE))
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {}
  return {
    auto: { enabled: false, frequency: 'daily', time: '02:00', weekDay: 1, monthDay: 1, retention: 7 },
    drive: { enabled: false, folderId: '', folderName: '', credentials: null, syncFrequency: 'daily' },
  };
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

async function doCreateBackup() {
  const [
    products, categories, parties,
    sales, saleItems,
    purchases, purchaseItems,
    paymentInHistory, paymentOutHistory,
    cashTransactions, bankAccounts, cheques,
    loanAccounts, loanTransactions,
    capitalInvestments,
    expenses, expenseCategories,
    employees, attendanceRecords, salaryRecords,
    estimates, estimateItems,
    saleReturns, saleReturnItems,
    purchaseReturns, purchaseReturnItems,
    uoms, uomConversions,
    paymentModes, paymentTypeSettings,
    designations,
    settings,
  ] = await Promise.all([
    prisma.product.findMany(),
    prisma.category.findMany(),
    prisma.party.findMany(),
    prisma.sale.findMany(),
    prisma.saleItem.findMany(),
    prisma.purchase.findMany(),
    prisma.purchaseItem.findMany(),
    prisma.paymentInHistory.findMany(),
    prisma.paymentOutHistory.findMany(),
    prisma.cashTransaction.findMany(),
    prisma.bankAccount.findMany(),
    prisma.cheque.findMany(),
    prisma.loanAccount.findMany(),
    prisma.loanTransaction.findMany(),
    prisma.capitalInvestment.findMany(),
    prisma.expense.findMany(),
    prisma.expenseCategory.findMany(),
    prisma.employee.findMany(),
    prisma.attendanceRecord.findMany(),
    prisma.salaryRecord.findMany(),
    prisma.estimate.findMany(),
    prisma.estimateItem.findMany(),
    prisma.saleReturn.findMany(),
    prisma.saleReturnItem.findMany(),
    prisma.purchaseReturn.findMany(),
    prisma.purchaseReturnItem.findMany(),
    prisma.uom.findMany(),
    prisma.uomConversion.findMany(),
    prisma.paymentMode.findMany(),
    prisma.paymentTypeSetting.findMany(),
    prisma.designation.findMany(),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tables: {
      products, categories, parties,
      sales, saleItems,
      purchases, purchaseItems,
      paymentInHistory, paymentOutHistory,
      cashTransactions, bankAccounts, cheques,
      loanAccounts, loanTransactions,
      capitalInvestments,
      expenses, expenseCategories,
      employees, attendanceRecords, salaryRecords,
      estimates, estimateItems,
      saleReturns, saleReturnItems,
      purchaseReturns, purchaseReturnItems,
      uoms, uomConversions,
      paymentModes, paymentTypeSettings,
      designations,
      settings: settings ? [settings] : [],
    },
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${ts}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(payload));

  // Enforce retention
  const cfg = loadConfig();
  const retention = cfg.auto?.retention ?? 30;
  const allFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.t - a.t);
  allFiles.slice(retention).forEach(({ f }) => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
  });

  return { filename, size: fs.statSync(filepath).size, createdAt: fs.statSync(filepath).mtime };
}

// Auto backup scheduler — checks every hour
function checkAutoBackup() {
  try {
    const cfg = loadConfig();
    if (!cfg.auto?.enabled) return;

    const now = new Date();
    const [hStr, mStr] = (cfg.auto.time || '02:00').split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    // Get last backup timestamp from most recent file
    const files = fs.existsSync(BACKUP_DIR)
      ? fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
          .map(f => fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime())
          .sort((a, b) => b - a)
      : [];
    const lastTs = files.length ? new Date(files[0]) : null;

    let shouldRun = false;
    if (cfg.auto.frequency === 'daily') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      shouldRun = now >= today && (!lastTs || lastTs < today);
    } else if (cfg.auto.frequency === 'weekly') {
      const dayOfWeek = cfg.auto.weekDay ?? 1; // 0=Sun
      const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
      const target = new Date(now);
      target.setDate(now.getDate() - (daysUntil === 0 ? 0 : 7 - daysUntil));
      target.setHours(h, m, 0, 0);
      shouldRun = now >= target && (!lastTs || lastTs < target);
    } else if (cfg.auto.frequency === 'monthly') {
      const monthDay = cfg.auto.monthDay ?? 1;
      const target = new Date(now.getFullYear(), now.getMonth(), monthDay, h, m);
      shouldRun = now >= target && (!lastTs || lastTs < target);
    }

    if (shouldRun) {
      doCreateBackup().catch(err => console.error('[backup] auto backup failed:', err));
    }
  } catch (err) {
    console.error('[backup] scheduler error:', err);
  }
}

// Start scheduler
setTimeout(checkAutoBackup, 10_000);
setInterval(checkAutoBackup, 60 * 60 * 1000);

const router = Router();

/* GET /api/backup/list */
router.get('/list', (_req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const items = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.mtime };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/backup/create */
router.post('/create', async (_req, res) => {
  try {
    const result = await doCreateBackup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/backup/download/:filename */
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (!filename.startsWith('backup_') || !filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.download(filepath);
});

/* DELETE /api/backup/:filename */
router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  if (!filename.startsWith('backup_') || !filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  try {
    fs.unlinkSync(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/backup/settings */
router.get('/settings', (_req, res) => {
  res.json(loadConfig());
});

/* PUT /api/backup/settings */
router.put('/settings', (req, res) => {
  try {
    const current = loadConfig();
    const updated = { ...current, ...req.body };
    saveConfig(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
