import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/* GET /api/attendance?date=YYYY-MM-DD              → all records for a date   */
/* GET /api/attendance?employeeId=X&month=YYYY-MM   → monthly records          */
router.get('/', async (req, res) => {
  const { date, employeeId, month } = req.query;

  if (date) {
    const records = await prisma.attendanceRecord.findMany({
      where: { date: new Date(date) },
      include: { employee: { select: { id: true, name: true, designation: true, department: true } } },
    });
    return res.json(records);
  }

  if (employeeId && month) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to   = new Date(year, mon, 0);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: Number(employeeId),
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });
    return res.json(records);
  }

  if (employeeId) {
    const records = await prisma.attendanceRecord.findMany({
      where: { employeeId: Number(employeeId) },
      orderBy: { date: 'desc' },
    });
    return res.json(records);
  }

  res.json([]);
});

/* POST /api/attendance — upsert single record */
router.post('/', async (req, res) => {
  const { employeeId, date, status, note } = req.body;
  if (!employeeId || !date || !status)
    return res.status(400).json({ error: 'employeeId, date and status are required' });

  const record = await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: Number(employeeId), date: new Date(date) } },
    create: { employeeId: Number(employeeId), date: new Date(date), status, note: note || null },
    update: { status, note: note || null },
  });
  res.json(record);
});

/* POST /api/attendance/bulk — upsert multiple records for one date */
router.post('/bulk', async (req, res) => {
  const { date, entries } = req.body;
  if (!date || !Array.isArray(entries))
    return res.status(400).json({ error: 'date and entries[] required' });

  const results = await Promise.all(
    entries.map(({ employeeId, status, note }) =>
      prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: Number(employeeId), date: new Date(date) } },
        create: { employeeId: Number(employeeId), date: new Date(date), status, note: note || null },
        update: { status, note: note || null },
      }),
    ),
  );
  res.json(results);
});

/* GET /api/attendance/summary?month=YYYY-MM → per-employee summary */
router.get('/summary', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month required' });

  const [year, mon] = month.split('-').map(Number);
  const from = new Date(year, mon - 1, 1);
  const to   = new Date(year, mon, 0);

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, designation: true, department: true, isActive: true } }),
    prisma.attendanceRecord.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  const summary = employees.map(emp => {
    const empRecs = records.filter(r => r.employeeId === emp.id);
    return {
      ...emp,
      present:  empRecs.filter(r => r.status === 'present').length,
      absent:   empRecs.filter(r => r.status === 'absent').length,
      halfday:  empRecs.filter(r => r.status === 'halfday').length,
      leave:    empRecs.filter(r => r.status === 'leave').length,
      holiday:  empRecs.filter(r => r.status === 'holiday').length,
      total:    empRecs.length,
      isActive: emp.isActive,
    };
  });
  res.json(summary);
});

router.delete('/:id', async (req, res) => {
  await prisma.attendanceRecord.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

export default router;
