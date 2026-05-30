import { z } from 'zod';
import { MAX_NAME_LEN, MAX_NOTE_LEN, MAX_PHONE_LEN } from '@constants';

export const employeeSchema = z.object({
  name:           z.string().min(1, 'Name is required').max(MAX_NAME_LEN),
  employeeCode:   z.string().max(20).optional().or(z.literal('')),
  phone:          z.string().max(MAX_PHONE_LEN).optional().or(z.literal('')),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  designation:    z.string().optional().or(z.literal('')),
  department:     z.string().max(MAX_NAME_LEN).optional().or(z.literal('')),
  dateOfJoining:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional().or(z.literal('')),
  basicSalary:    z.coerce.number().nonnegative('Salary must be ≥ 0').default(0),
  salaryType:     z.enum(['perMonth', 'perDay']).default('perMonth'),
  employeeType:   z.enum(['regular', 'dailyWages']).default('dailyWages'),
  address:        z.string().max(MAX_NOTE_LEN).optional().or(z.literal('')),
  notes:          z.string().max(MAX_NOTE_LEN).optional().or(z.literal('')),
});
