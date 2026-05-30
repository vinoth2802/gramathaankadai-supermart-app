import { z } from 'zod';
import { PAYMENT_MODES } from '@constants';

const purchaseItemSchema = z.object({
  name:      z.string().min(1, 'Item name is required'),
  qty:       z.coerce.number().positive('Qty must be > 0'),
  price:     z.coerce.number().nonnegative(),
  gstRate:   z.coerce.number().nonnegative().default(0),
  unit:      z.string().default('PCS'),
  total:     z.coerce.number().nonnegative().default(0),
  batchNo:   z.string().optional().or(z.literal('')),
  expiryDate:z.string().optional().or(z.literal('')),
});

export const purchaseSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  partyId:     z.string().optional().or(z.literal('')),
  priceType:   z.enum(['With Tax', 'Without Tax']).default('With Tax'),
  paymentMode: z.enum(PAYMENT_MODES).default('Cash'),
  items:       z.array(purchaseItemSchema).min(1, 'At least one item required'),
  note:        z.string().optional().or(z.literal('')),
});
