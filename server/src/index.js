import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import itemsRouter      from './routes/items.js';
import partiesRouter    from './routes/parties.js';
import salesRouter      from './routes/sales.js';
import purchasesRouter  from './routes/purchases.js';
import paymentsRouter   from './routes/payments.js';
import accountsRouter   from './routes/accounts.js';
import settingsRouter   from './routes/settings.js';
import categoriesRouter        from './routes/categories.js';
import unitsRouter             from './routes/units.js';
import capitalInvestmentsRouter from './routes/capitalInvestments.js';
import estimatesRouter          from './routes/estimates.js';
import usersRouter              from './routes/users.js';
import rolesRouter              from './routes/roles.js';
import authRouter               from './routes/auth.js';
import resetRouter              from './routes/reset.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Prisma returns Decimal as an object and BigInt natively — serialize both to JS primitives
app.set('json replacer', (_key, value) => {
  if (value !== null && typeof value === 'object' && value.constructor?.name === 'Decimal') {
    return parseFloat(value.toString());
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
});

app.use('/api/items',     itemsRouter);
app.use('/api/parties',   partiesRouter);
app.use('/api/sales',     salesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/payments',  paymentsRouter);
app.use('/api/accounts',  accountsRouter);
app.use('/api/settings',    settingsRouter);
app.use('/api/categories',  categoriesRouter);
app.use('/api/units',               unitsRouter);
app.use('/api/capital-investments', capitalInvestmentsRouter);
app.use('/api/estimates',           estimatesRouter);
app.use('/api/users',               usersRouter);
app.use('/api/roles',               rolesRouter);
app.use('/api/auth',                authRouter);
app.use('/api/reset',               resetRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
