import { z } from 'zod';

export const bankAccountSchema = z.object({
  bankName:  z.string().min(1, 'Bank name is required').max(100),
  accountNo: z.string().max(30).optional().or(z.literal('')),
  ifsc:      z.string().max(20).optional().or(z.literal('')),
  balance:   z.number().nonnegative('Balance cannot be negative').default(0),
  type:      z.enum(['Current', 'Savings', 'Cash Credit', 'Overdraft']).default('Current'),
});

export const bankTransferSchema = z.object({
  amount: z.number().positive('Transfer amount must be greater than 0'),
});
