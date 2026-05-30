import { z } from 'zod';
import { PAYMENT_MODES } from '@constants';

export const createLoanSchema = z.object({
  name:           z.string().min(1, 'Account name is required'),
  principal:      z.coerce.number().positive('Loan amount must be greater than 0'),
  interestRate:   z.coerce.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%').default(0),
  startDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  durationMonths: z.coerce.number().nonnegative('Duration cannot be negative').default(0),
  lenderName:     z.string().optional().or(z.literal('')),
  paymentMode:    z.enum(PAYMENT_MODES).default('Cash'),
  notes:          z.string().optional().or(z.literal('')),
});

export const loanPaymentSchema = z.object({
  paymentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  principal:     z.coerce.number().nonnegative('Principal cannot be negative').default(0),
  interest:      z.coerce.number().nonnegative('Interest cannot be negative').default(0),
  otherCharges:  z.coerce.number().nonnegative('Charges cannot be negative').default(0),
  paymentMode:   z.enum(PAYMENT_MODES).default('Cash'),
  referenceNo:   z.string().optional().or(z.literal('')),
  notes:         z.string().optional().or(z.literal('')),
}).refine(d => (Number(d.principal) + Number(d.interest) + Number(d.otherCharges)) > 0, {
  message: 'At least one payment amount is required',
});

export const loanDrawdownSchema = z.object({
  amount:       z.coerce.number().positive('Drawdown amount must be greater than 0'),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  interestRate: z.coerce.number().min(0).max(100).default(0),
  paymentMode:  z.enum(PAYMENT_MODES).default('Cash'),
  notes:        z.string().optional().or(z.literal('')),
});
