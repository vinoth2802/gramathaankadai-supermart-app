import { z } from 'zod';
import { PAYMENT_MODES } from '@constants';

const returnItemSchema = z.object({
  name:  z.string().min(1, 'Item name is required'),
  qty:   z.coerce.number().positive('Return qty must be greater than 0'),
  price: z.coerce.number().nonnegative('Price cannot be negative'),
  unit:  z.string().default('PCS'),
});

export const purchaseReturnSchema = z.object({
  partyId:     z.string().optional().or(z.literal('')),
  returnType:  z.string().default('Purchase Return'),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  paymentMode: z.enum(PAYMENT_MODES).default('Cash'),
  items:       z.array(returnItemSchema).min(1, 'At least one item is required'),
  notes:       z.string().optional().or(z.literal('')),
});
