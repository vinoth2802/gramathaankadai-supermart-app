import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const INCLUDE = {
  employee:  { select: { id: true, name: true, designation: true, employeeCode: true } },
  leaveType: { select: { id: true, name: true, code: true, color: true, isPaid: true } },
};

/* GET /api/leave-requests — filtered list */
router.get('/', async (req, res) => {
  try {
    const { employeeId, leaveTypeId, status, year, month } = req.query;
    const where = {};
    if (employeeId)  where.employeeId  = Number(employeeId);
    if (leaveTypeId) where.leaveTypeId = Number(leaveTypeId);
    if (status && status !== 'all') where.status = status;
    if (year) {
      const y = Number(year);
      const m = month ? Number(month) : null;
      where.fromDate = m
        ? { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
        : { gte: new Date(y, 0, 1),     lt: new Date(y + 1, 0, 1) };
    }
    const requests = await prisma.leaveRequest.findMany({
      where, include: INCLUDE, orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* GET /api/leave-requests/balance — leave balance for employee in year */
router.get('/balance', async (req, res) => {
  try {
    const { employeeId, year } = req.query;
    if (!employeeId || !year) return res.status(400).json({ error: 'employeeId and year required' });
    const y = Number(year);
    const [types, approved] = await Promise.all([
      prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.leaveRequest.findMany({
        where: { employeeId: Number(employeeId), status: 'approved',
          fromDate: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } },
      }),
    ]);
    const usedMap = {};
    approved.forEach(r => { usedMap[r.leaveTypeId] = (usedMap[r.leaveTypeId] || 0) + Number(r.days); });
    res.json(types.map(t => ({
      ...t, used: usedMap[t.id] || 0, available: t.annualAllotment - (usedMap[t.id] || 0),
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* POST /api/leave-requests */
router.post('/', async (req, res) => {
  try {
    const { employeeId, leaveTypeId, fromDate, toDate, days, reason } = req.body;
    if (!employeeId || !leaveTypeId || !fromDate || !toDate || !days)
      return res.status(400).json({ error: 'employeeId, leaveTypeId, fromDate, toDate and days are required' });
    const request = await prisma.leaveRequest.create({
      data: {
        employeeId:  Number(employeeId),
        leaveTypeId: Number(leaveTypeId),
        fromDate:    new Date(fromDate),
        toDate:      new Date(toDate),
        days:        Number(days),
        reason:      reason || null,
      },
      include: INCLUDE,
    });
    res.status(201).json(request);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* PATCH /api/leave-requests/:id/status */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, approvedBy, remarks } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const request = await prisma.leaveRequest.update({
      where: { id: Number(req.params.id) },
      data:  { status, approvedBy: approvedBy || null, remarks: remarks || null },
      include: INCLUDE,
    });
    res.json(request);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* DELETE /api/leave-requests/:id */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.leaveRequest.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
