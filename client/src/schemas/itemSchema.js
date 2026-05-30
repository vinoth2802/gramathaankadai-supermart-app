import { z } from 'zod';
import { MAX_NAME_LEN } from '@constants';

export const itemSchema = z.object({
  shortName:     z.string().min(1, 'Item name is required').max(MAX_NAME_LEN),
  type:          z.enum(['Product', 'Service']).default('Product'),
  mrp:           z.number().nonnegative('MRP cannot be negative').default(0),
  salesPrice:    z.number().nonnegative('Sale price cannot be negative').default(0),
  wholesalePrice:z.number().nonnegative('Wholesale price cannot be negative').default(0),
  wholesaleQty:  z.number().nonnegative('Wholesale qty cannot be negative').default(0),
  purchasePrice: z.number().nonnegative('Purchase price cannot be negative').default(0),
  gstRate:       z.number().nonnegative().default(0),
  stock:         z.number().nonnegative('Opening qty cannot be negative').default(0),
  atPrice:       z.number().nonnegative('At price cannot be negative').default(0),
  minStock:      z.number().nonnegative('Min stock cannot be negative').default(0),
  reorderLevel:  z.number().nonnegative('Reorder level cannot be negative').default(0),
});
