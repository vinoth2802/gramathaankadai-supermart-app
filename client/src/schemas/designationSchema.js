import { z } from 'zod';
import { MAX_NAME_LEN } from '@constants';

export const designationSchema = z.object({
  name:       z.string().min(1, 'Designation name is required').max(MAX_NAME_LEN),
  department: z.string().optional().or(z.literal('')),
});
