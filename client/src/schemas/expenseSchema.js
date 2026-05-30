import { z } from 'zod';
import { PAYMENT_MODES, MAX_NOTE_LEN } from '@constants';

export const expenseSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  category:    z.string().min(1, 'Category is required'),
  amount:      z.coerce.number().positive('Amount must be > 0'),
  paymentMode: z.enum(PAYMENT_MODES).default('Cash'),
  partyName:   z.string().optional().or(z.literal('')),
  note:        z.string().max(MAX_NOTE_LEN).optional().or(z.literal('')),
});
