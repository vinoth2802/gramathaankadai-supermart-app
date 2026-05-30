import { z } from 'zod';
import { MAX_NAME_LEN, MAX_NOTE_LEN, MAX_PHONE_LEN } from '@constants';

export const partySchema = z.object({
  name:         z.string().min(1, 'Name is required').max(MAX_NAME_LEN),
  phone:        z.string().max(MAX_PHONE_LEN).optional().or(z.literal('')),
  email:        z.string().email('Invalid email').optional().or(z.literal('')),
  gstin:        z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN').optional().or(z.literal('')),
  address:      z.string().max(MAX_NOTE_LEN).optional().or(z.literal('')),
  openingBalance: z.coerce.number().default(0),
  balanceType:  z.enum(['payable', 'receivable']).default('receivable'),
});
