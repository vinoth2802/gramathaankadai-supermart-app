import { z } from 'zod';

const estimateItemSchema = z.object({
  name:    z.string().min(1, 'Item name is required'),
  qty:     z.coerce.number().positive('Qty must be greater than 0'),
  rate:    z.coerce.number().nonnegative('Rate cannot be negative'),
  gstRate: z.coerce.number().nonnegative().default(0),
  unit:    z.string().default('NO.'),
});

export const estimateSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  partyId:   z.string().optional().or(z.literal('')),
  items:     z.array(estimateItemSchema).min(1, 'At least one item is required'),
  notes:     z.string().optional().or(z.literal('')),
});
