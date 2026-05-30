import { z } from 'zod';

export const cashAdjustmentSchema = z.object({
  type:        z.enum(['Add Cash', 'Remove Cash']),
  amount:      z.coerce.number().positive('Amount must be greater than 0'),
  adjDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  description: z.string().optional().or(z.literal('')),
});
