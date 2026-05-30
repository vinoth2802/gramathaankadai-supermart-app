import { z } from 'zod';
import { PAYMENT_MODES } from '@constants';

export const paymentInSchema = z.object({
  partyId:      z.string().min(1, 'Customer is required'),
  paymentType:  z.string().default('Cash'),
  received:     z.coerce.number().nonnegative('Received amount cannot be negative').default(0),
  discount:     z.coerce.number().nonnegative('Discount cannot be negative').default(0),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  notes:        z.string().optional().or(z.literal('')),
}).refine(d => Number(d.received) > 0 || Number(d.discount) > 0, {
  message: 'Enter a received amount or discount',
});

export const paymentOutSchema = z.object({
  partyId:      z.string().min(1, 'Supplier is required'),
  paymentType:  z.string().default('Cash'),
  paid:         z.coerce.number().nonnegative('Paid amount cannot be negative').default(0),
  discount:     z.coerce.number().nonnegative('Discount cannot be negative').default(0),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  notes:        z.string().optional().or(z.literal('')),
}).refine(d => Number(d.paid) > 0 || Number(d.discount) > 0, {
  message: 'Enter a paid amount or discount',
});
