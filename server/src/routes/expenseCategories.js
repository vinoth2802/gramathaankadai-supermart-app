import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const DEFAULTS = [
  { name: 'Transport',            type: 'Direct',   color: 'bg-violet-100 text-violet-700'  },
  { name: 'Fuel',                 type: 'Direct',   color: 'bg-yellow-100 text-yellow-700'  },
  { name: 'Maintenance',          type: 'Direct',   color: 'bg-orange-100 text-orange-700'  },
  { name: 'Raw Materials',        type: 'Direct',   color: 'bg-lime-100 text-lime-700'      },
  { name: 'Packaging',            type: 'Direct',   color: 'bg-purple-100 text-purple-700'  },
  { name: 'Rent',                 type: 'Indirect', color: 'bg-blue-100 text-blue-700'      },
  { name: 'Electricity',          type: 'Indirect', color: 'bg-amber-100 text-amber-700'    },
  { name: 'Water',                type: 'Indirect', color: 'bg-cyan-100 text-cyan-700'      },
  { name: 'Salaries',             type: 'Indirect', color: 'bg-indigo-100 text-indigo-700'  },
  { name: 'Office Supplies',      type: 'Indirect', color: 'bg-emerald-100 text-emerald-700'},
  { name: 'Marketing',            type: 'Indirect', color: 'bg-pink-100 text-pink-700'      },
  { name: 'Telephone / Internet', type: 'Indirect', color: 'bg-teal-100 text-teal-700'      },
  { name: 'Miscellaneous',        type: 'Indirect', color: 'bg-slate-100 text-slate-600'    },
];

router.get('/', async (req, res) => {
  let cats = await prisma.expenseCategory.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
  if (cats.length === 0) {
    await prisma.expenseCategory.createMany({ data: DEFAULTS, skipDuplicates: true });
    cats = await prisma.expenseCategory.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
  }
  res.json(cats);
});

router.post('/', async (req, res) => {
  const { name, type, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  try {
    const cat = await prisma.expenseCategory.create({
      data: { name: name.trim(), type, color: color || 'bg-slate-100 text-slate-600' },
    });
    res.status(201).json(cat);
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Category already exists' });
    throw e;
  }
});

router.delete('/:id', async (req, res) => {
  const id  = Number(req.params.id);
  const cat = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const inUse = await prisma.expense.count({ where: { category: cat.name } });
  if (inUse > 0) return res.status(400).json({ error: `Cannot delete — used by ${inUse} expense(s)` });
  await prisma.expenseCategory.delete({ where: { id } });
  res.json({ success: true });
});

export default router;
