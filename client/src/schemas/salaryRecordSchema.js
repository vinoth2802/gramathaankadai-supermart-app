import { z } from 'zod';

export const salaryRecordSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type:       z.enum(['salary', 'increment', 'incentive', 'bonus']),
  amount:     z.coerce.number().positive('Amount must be greater than 0'),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  month:      z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month (YYYY-MM)').optional().or(z.literal('')),
  notes:      z.string().optional().or(z.literal('')),
});
