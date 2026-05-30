import { z } from 'zod';
import { MAX_NAME_LEN } from '@constants';

export const itemCategorySchema = z.object({
  name:        z.string().min(1, 'Category name is required').max(MAX_NAME_LEN),
  description: z.string().optional().or(z.literal('')),
});

export const expenseCategorySchema = z.object({
  name:  z.string().min(1, 'Category name is required').max(MAX_NAME_LEN),
  type:  z.enum(['Direct', 'Indirect']).default('Indirect'),
  color: z.string().optional().or(z.literal('')),
});
