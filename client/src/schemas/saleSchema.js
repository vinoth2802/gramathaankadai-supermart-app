import { z } from 'zod';
import { PAYMENT_MODES, INDIAN_STATES } from '@constants';

const saleItemSchema = z.object({
  name:    z.string().min(1, 'Item name is required'),
  qty:     z.coerce.number().positive('Qty must be > 0'),
  rate:    z.coerce.number().nonnegative(),
  gstRate: z.coerce.number().nonnegative().default(0),
  unit:    z.string().default('NO.'),
  total:   z.coerce.number().nonnegative().default(0),
});

export const saleSchema = z.object({
  invoiceDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  paymentMode:  z.enum(PAYMENT_MODES).default('Cash'),
  stateSupply:  z.enum(INDIAN_STATES).default('Tamil Nadu'),
  priceMode:    z.enum(['withtax', 'withouttax']).default('withtax'),
  partyId:      z.string().optional().or(z.literal('')),
  items:        z.array(saleItemSchema).min(1, 'At least one item required'),
  totalReceived:z.coerce.number().nonnegative().default(0),
  description:  z.string().optional().or(z.literal('')),
});
