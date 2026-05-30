import { z } from 'zod';
import { PAYMENT_MODES } from '@constants';

export const capitalInvestmentSchema = z.object({
  name:        z.string().min(1, 'Investor name is required'),
  type:        z.enum(['Director', 'Promoter', 'Investor']).default('Investor'),
  phone:       z.string().optional().or(z.literal('')),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  address:     z.string().optional().or(z.literal('')),
  amount:      z.coerce.number().positive('Investment amount must be greater than 0'),
  equity:      z.coerce.number().min(0, 'Equity cannot be negative').max(100, 'Equity cannot exceed 100%').default(0),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  paymentMode: z.enum(PAYMENT_MODES).default('Cash'),
  reference:   z.string().optional().or(z.literal('')),
  notes:       z.string().optional().or(z.literal('')),
  status:      z.enum(['active', 'exited']).default('active'),
});
