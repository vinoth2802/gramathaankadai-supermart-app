import { z } from 'zod';

export const unitSchema = z.object({
  code:  z.string().min(1, 'Unit code is required').max(10).toUpperCase(),
  descr: z.string().min(1, 'Description is required').max(50),
});

export const unitConversionSchema = z.object({
  fromUnit:  z.string().min(1, 'From unit is required'),
  toUnit:    z.string().min(1, 'To unit is required'),
  factor:    z.coerce.number().positive('Conversion factor must be greater than 0'),
});
