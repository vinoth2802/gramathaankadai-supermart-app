import { z } from 'zod';
import { MAX_NAME_LEN } from '@constants';

export const leaveTypeSchema = z.object({
  name:     z.string().min(1, 'Leave type name is required').max(MAX_NAME_LEN),
  code:     z.string().min(1, 'Code is required').max(10),
  maxDays:  z.coerce.number().nonnegative('Max days cannot be negative').default(0),
  isPaid:   z.boolean().default(true),
});

export const leaveRequestSchema = z.object({
  employeeId:  z.string().min(1, 'Select an employee'),
  leaveTypeId: z.string().min(1, 'Select a leave type'),
  fromDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from date'),
  toDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to date'),
  days:        z.coerce.number().positive('Days must be greater than 0'),
  reason:      z.string().optional().or(z.literal('')),
}).refine(d => new Date(d.toDate) >= new Date(d.fromDate), {
  message: 'To date must be on or after from date',
  path: ['toDate'],
});
