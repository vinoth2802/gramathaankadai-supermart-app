# Gramathaankadai Supermart — Data Model

> Derived from all Flyway migrations (`db/migrations/V1–V20`) and the React client API layer.

---

## Table of Contents

1. [Domain Overview](#domain-overview)
2. [Entity Relationship Summary](#entity-relationship-summary)
3. [Reference & Configuration Tables](#reference--configuration-tables)
4. [Inventory](#inventory)
5. [Parties (Customers & Suppliers)](#parties-customers--suppliers)
6. [Sales](#sales)
7. [Purchases](#purchases)
8. [Payments & Cash](#payments--cash)
9. [Accounting & Assets](#accounting--assets)
10. [HR & Payroll](#hr--payroll)
11. [User Management & RBAC](#user-management--rbac)
12. [System Tables](#system-tables)

---

## Domain Overview

The application is a full-featured retail ERP covering:

| Domain | Key Tables |
|--------|-----------|
| Inventory | `products`, `categories`, `uom_list`, `uom_conversions` |
| Trading | `sales`, `sale_items`, `purchases`, `purchase_items`, `estimates`, `estimate_items` |
| Returns | `sale_returns`, `sale_return_items`, `purchase_returns`, `purchase_return_items` |
| Parties | `parties` |
| Payments | `payment_in_history`, `payment_out_history`, `cash_transactions`, `bank_accounts`, `cheques` |
| Finance | `expenses`, `expense_categories`, `fixed_assets`, `capital_investments`, `loan_accounts`, `loan_transactions` |
| HR | `employees`, `designations`, `attendance_records`, `salary_records`, `leave_types`, `leave_requests` |
| Auth | `app_users`, `app_roles`, `app_permissions`, `app_role_permissions` |
| Config | `settings`, `payment_modes`, `payment_type_settings` |
| Audit | `audit_log`, `recycle_bin` |

---

## Entity Relationship Summary

```
parties ──< sales ──< sale_items >── products
        ──< purchases ──< purchase_items
        ──< estimates ──< estimate_items >── products
        ──< sale_returns ──< sale_return_items >── products
        ──< purchase_returns ──< purchase_return_items
        ──< payment_in_history
        ──< payment_out_history
        ──< cheques
        ──< expenses

employees ──< attendance_records
          ──< salary_records
          ──< leave_requests >── leave_types

loan_accounts ──< loan_transactions

app_roles ──< app_role_permissions >── app_permissions
         ──< app_users

uom_list ──< uom_conversions >── uom_list (base ↔ secondary)
payment_modes ──── payment_type_settings
```

---

## Reference & Configuration Tables

### `uom_list` — Units of Measure

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `code` | VARCHAR(10) UNIQUE | e.g. KG, PCS, LTR, GM, MT, BOX, PKT, BTL |
| `descr` | VARCHAR(100) | Human-readable label |

### `uom_conversions`

Defines conversion factors between two units (e.g. 1 KG = 1000 GM).

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `base_uom_id` | INT FK → `uom_list.id` | |
| `secondary_uom_id` | INT FK → `uom_list.id` | |
| `factor` | FLOAT DEFAULT 1 | `secondary = base × factor` |
| `created_at` | TIMESTAMPTZ | |

### `categories`

Item categories for product grouping.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) UNIQUE | |
| `created_at` | TIMESTAMPTZ | |

### `payment_modes`

Master list of accepted payment methods.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(100) UNIQUE | Cash, UPI, Bank Transfer, Cheque, Card |
| `descr` | VARCHAR(255) | |
| `is_active` | BOOLEAN DEFAULT TRUE | |

### `payment_type_settings`

UI display configuration for each payment mode.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `payment_mode_id` | INT UNIQUE FK → `payment_modes.id` | |
| `color` | VARCHAR(20) DEFAULT `'blue'` | Tailwind colour name |
| `icon` | VARCHAR(50) DEFAULT `'CreditCard'` | Lucide icon name |
| `description` | TEXT | |
| `display_order` | INT DEFAULT 0 | Sort order in UI |
| `is_default` | BOOLEAN DEFAULT false | |
| `created_at` | TIMESTAMP | |

### `settings`

Singleton row (`id = 1`) holding all shop-wide configuration.

| Group | Key Columns |
|-------|------------|
| Shop identity | `shop_name`, `firm_name`, `address`, `pincode`, `state`, `phone`, `gstin` |
| Invoicing | `invoice_prefix`, `currency` |
| Loyalty programme | `loyalty_enabled`, `loyalty_points_per_rupee`, `loyalty_min_points`, `loyalty_points_value`, `loyalty_expiry_days`, `loyalty_max_discount`, `loyalty_allow_partial`, `loyalty_show_on_invoice` |
| Print controls | 20+ boolean flags (e.g. `print_show_logo`, `print_show_gstin`, …) |
| Tax | `tax_method`, `tax_default_gst_rate`, `tax_round_off`, `tax_supply_type`, `tax_business_type`, `tax_composition_rate`, TCS/TDS/Cess flags, `tax_active_slabs` (JSONB), `tax_custom_slabs` (JSONB) |
| Transactions | `payment_modes` (JSON array), `credit_days`, `allow_negative_stock`, `decimal_qty`, returns flags |
| Parties | `default_party_type`, `require_gstin`, `credit_limit`, `duplicate_check`, `balance_display` |
| Items | `default_uom`, batch/expiry/MRP/HSN/location enable flags, `barcode_type` |
| Units | `unit_conversion_enabled` |

---

## Inventory

### `products`

Central inventory table.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `short_name` | VARCHAR(255) NOT NULL | Display name |
| `item_code` | VARCHAR(100) UNIQUE | SKU / barcode |
| `category` | VARCHAR(100) DEFAULT `'General'` | Free-text; mirrors `categories.name` |
| `hsn_code` | VARCHAR(20) | GST HSN code |
| `uom` | VARCHAR(10) DEFAULT `'PCS'` | Primary unit |
| `secondary_unit` | VARCHAR(20) | Secondary unit for dual-unit products |
| `pcs_per_unit` | INT | Conversion factor between primary and secondary |
| `is_bulk` | BOOLEAN DEFAULT false | Whether sold in bulk |
| `purchase_price` | DECIMAL(12,2) | Cost price |
| `purchase_price_tax` | VARCHAR(10) DEFAULT `'with'` | `'with'` or `'without'` tax |
| `mrp` | DECIMAL(12,2) | Maximum retail price |
| `sales_price` | DECIMAL(12,2) | Standard selling price |
| `sales_price_tax` | VARCHAR(10) DEFAULT `'with'` | `'with'` or `'without'` tax |
| `wholesale_price` | DECIMAL(12,2) | Wholesale selling price |
| `wholesale_qty` | DECIMAL(12,3) | Minimum qty to apply wholesale price |
| `at_price` | DECIMAL(12,2) | Special / AT price |
| `as_of_date` | DATE | Effective date for `at_price` |
| `gst_rate` | DECIMAL(5,2) DEFAULT 5 | GST % |
| `stock` | DECIMAL(12,3) | Current stock quantity |
| `reorder_level` | DECIMAL(12,3) DEFAULT 10 | Trigger reorder below this |
| `min_stock` | DECIMAL(12,3) | Hard minimum threshold |
| `expiry_date` | DATE | |
| `batch` | VARCHAR(50) | Default batch |
| `location` | VARCHAR(100) | Shelf / bin location |
| `type` | VARCHAR(20) DEFAULT `'Product'` | Product / Service / etc. |
| `description` | TEXT | |
| `is_active` | BOOLEAN DEFAULT true | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Indexes:** `short_name`

---

## Parties (Customers & Suppliers)

### `parties`

Unified table for customers, suppliers, or both.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) NOT NULL | |
| `type` | VARCHAR(10) CHECK | `'customer'`, `'supplier'`, `'both'` |
| `party_type` | VARCHAR(20) DEFAULT `'B2C'` | `'B2B'` or `'B2C'` |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(255) | |
| `address` | TEXT | |
| `gstin` | VARCHAR(20) | Relevant for B2B parties |
| `balance` | DECIMAL(12,2) | Receivable from customer (positive = they owe us) |
| `payable` | DECIMAL(12,2) | Payable to supplier (positive = we owe them) |
| `loyalty_points` | DECIMAL(12,2) DEFAULT 0 | Accumulated loyalty points |
| `last_sale` | DATE | Date of most recent sale |
| `notes` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

---

## Sales

### `sales`

Invoice header.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `invoice` | VARCHAR(50) UNIQUE | Auto-generated (prefix + counter) |
| `date` | TIMESTAMPTZ DEFAULT NOW() | |
| `party_id` | INT FK → `parties.id` ON DELETE SET NULL | |
| `customer_name` | VARCHAR(255) DEFAULT `'Walk-in Customer'` | Snapshot of name at time of sale |
| `phone` | VARCHAR(20) | |
| `billing_address` | TEXT | |
| `shipping_address` | TEXT | |
| `state_of_supply` | VARCHAR(100) DEFAULT `'Tamil Nadu'` | For GST calculation |
| `subtotal` | DECIMAL(12,2) | Before tax and discount |
| `discount` | DECIMAL(12,2) DEFAULT 0 | Invoice-level discount |
| `gst` | DECIMAL(12,2) | Total GST amount |
| `grand_total` | DECIMAL(12,2) | Final payable amount |
| `payment_mode` | VARCHAR(100) | |
| `payment_status` | VARCHAR(20) DEFAULT `'Paid'` | `'Paid'`, `'Unpaid'`, `'Partial'`, etc. |
| `total_received` | DECIMAL(12,2) | Amount actually received |
| `change_given` | DECIMAL(12,2) | Change returned to customer |
| `due_date` | DATE | For credit sales |
| `vehicle_no` | VARCHAR(50) | Delivery vehicle |
| `delivery_date` | DATE | |
| `delivery_location` | TEXT | |
| `dispatch_location` | TEXT | |
| `notes` | TEXT | |
| `terms` | TEXT | Terms and conditions |
| `status` | VARCHAR(20) DEFAULT `'active'` | `'active'` / `'deleted'` |
| `created_at` | TIMESTAMPTZ | |

### `sale_items`

Line items (snapshot — not live-linked to product prices).

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `sale_id` | INT FK → `sales.id` ON DELETE CASCADE | |
| `product_id` | INT FK → `products.id` ON DELETE SET NULL | Nullable to preserve history after product deletion |
| `name` | VARCHAR(255) | Snapshot of product name |
| `description` | TEXT | |
| `qty` | DECIMAL(12,3) | |
| `item_count` | DECIMAL(12,3) DEFAULT 0 | Secondary unit quantity |
| `unit` | VARCHAR(50) | Unit used at time of sale |
| `rate` | DECIMAL(12,2) | Selling price per unit at time of sale |
| `mrp` | DECIMAL(12,2) | MRP snapshot |
| `discount` | DECIMAL(12,2) DEFAULT 0 | Line-level discount |
| `free_qty` | DECIMAL(12,3) DEFAULT 0 | Scheme free quantity |
| `gst_rate` | DECIMAL(5,2) | |
| `gst_amount` | DECIMAL(12,2) | |
| `amount` | DECIMAL(12,2) | `(qty × rate) - discount + gst_amount` |
| `batch_no` | VARCHAR(50) | |
| `exp_date` | VARCHAR(20) | |
| `mfg_date` | VARCHAR(20) | |
| `size` | VARCHAR(50) | |

### `estimates`

Quotations / proforma invoices.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `estimate_no` | INTEGER UNIQUE | Auto-incremented estimate number |
| `estimate_date` | DATE DEFAULT CURRENT_DATE | |
| `valid_till` | DATE | |
| `party_id` | INT FK → `parties.id` | |
| `customer_name` | VARCHAR(255) DEFAULT `'Walk-in Customer'` | |
| `phone` | VARCHAR(20) | |
| `billing_address` | TEXT | |
| `state_of_supply` | VARCHAR(100) DEFAULT `'Tamil Nadu'` | |
| `subtotal` | DECIMAL(12,2) DEFAULT 0 | |
| `gst` | DECIMAL(12,2) DEFAULT 0 | |
| `grand_total` | DECIMAL(12,2) DEFAULT 0 | |
| `adjustment` | DECIMAL(12,2) DEFAULT 0 | Manual rounding adjustment |
| `status` | VARCHAR(20) DEFAULT `'Open'` | `'Open'`, `'Converted'`, `'Cancelled'` |
| `notes` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | |

### `estimate_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `estimate_id` | INT FK → `estimates.id` ON DELETE CASCADE | |
| `product_id` | INT FK → `products.id` | |
| `name` | VARCHAR(255) | |
| `description` | TEXT | |
| `qty` | DECIMAL(12,3) | |
| `item_count` | DECIMAL(12,3) | Secondary unit qty |
| `free_qty` | DECIMAL(12,3) | |
| `unit` | VARCHAR(20) | |
| `rate` | DECIMAL(12,2) | |
| `mrp` | DECIMAL(12,2) | |
| `gst_rate` | DECIMAL(5,2) | |
| `gst_amount` | DECIMAL(12,2) | |
| `amount` | DECIMAL(12,2) | |
| `batch_no` | VARCHAR(50) | |
| `exp_date` | VARCHAR(20) | |
| `mfg_date` | VARCHAR(20) | |
| `size` | VARCHAR(50) | |
| `created_at` | TIMESTAMP | |

### `sale_returns` — Credit Notes

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `credit_note_no` | VARCHAR(50) UNIQUE | |
| `date` | DATE DEFAULT CURRENT_DATE | |
| `party_id` | INT FK → `parties.id` ON DELETE SET NULL | |
| `party_name` | VARCHAR(255) DEFAULT `'Walk-in Customer'` | |
| `reference_invoice` | VARCHAR(50) | Original sale invoice |
| `type` | VARCHAR(50) DEFAULT `'Credit Note'` | |
| `subtotal`, `gst`, `grand_total` | DECIMAL(12,2) | |
| `payment_mode` | VARCHAR(50) DEFAULT `'Cash'` | |
| `total_received` | DECIMAL(12,2) | |
| `due_date` | DATE | |
| `payment_status` | VARCHAR(20) DEFAULT `'Unpaid'` | |
| `notes` | TEXT | |
| `status` | VARCHAR(20) DEFAULT `'active'` | |
| `created_at` | TIMESTAMP | |

### `sale_return_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `return_id` | INT FK → `sale_returns.id` ON DELETE CASCADE | |
| `product_id` | INT FK → `products.id` ON DELETE SET NULL | |
| `name` | VARCHAR(255) | |
| `qty` | DECIMAL(12,3) | |
| `rate`, `amount` | DECIMAL(12,2) | |
| `unit` | VARCHAR(50) | |
| `gst_rate` | DECIMAL(5,2) | |
| `gst_amount` | DECIMAL(12,2) | |
| `created_at` | TIMESTAMP | |

---

## Purchases

### `purchases`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `invoice` | VARCHAR(50) UNIQUE | Internal purchase reference |
| `date` | TIMESTAMPTZ DEFAULT NOW() | |
| `party_id` | INT FK → `parties.id` ON DELETE SET NULL | |
| `party_name` | VARCHAR(255) | Snapshot |
| `subtotal`, `discount`, `gst` | DECIMAL(12,2) | |
| `grand_total` | DECIMAL(12,2) | |
| `total_paid` | DECIMAL(12,2) | |
| `payment_status` | VARCHAR(20) DEFAULT `'Paid'` | |
| `payment_mode` | VARCHAR(100) | |
| `due_date` | DATE | |
| `supplier_invoice_no` | VARCHAR(100) | Supplier's own invoice number |
| `supplier_invoice_date` | DATE | |
| `eway_bill_no` | VARCHAR | |
| `status` | VARCHAR(20) DEFAULT `'active'` | |
| `created_at` | TIMESTAMPTZ | |

### `purchase_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `purchase_id` | INT FK → `purchases.id` ON DELETE CASCADE | |
| `name` | VARCHAR(255) | Product name snapshot |
| `qty` | DECIMAL(12,3) | |
| `price` | DECIMAL(12,2) | Unit purchase price |
| `total` | DECIMAL(12,2) | |
| `discount` | DECIMAL(12,2) | |
| `unit` | VARCHAR(50) | |
| `gst_rate` | DECIMAL(5,2) | |
| `gst_amount` | DECIMAL(12,2) | |
| `mrp` | DECIMAL(12,2) | |
| `batch_no` | VARCHAR(100) | |
| `expiry_date` | DATE | |
| `mfg_date` | DATE | |

### `purchase_returns` — Debit Notes

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `debit_note_no` | VARCHAR(50) UNIQUE | |
| `date` | DATE DEFAULT CURRENT_DATE | |
| `party_id` | INT FK → `parties.id` | |
| `party_name` | VARCHAR(255) DEFAULT `'Walk-in Supplier'` | |
| `reference_invoice` | VARCHAR(100) | Original purchase invoice |
| `type` | VARCHAR(50) DEFAULT `'Debit Note'` | |
| `subtotal`, `gst`, `grand_total` | DECIMAL(12,2) | |
| `payment_mode` | VARCHAR(50) DEFAULT `'Cash'` | |
| `total_paid` | DECIMAL(12,2) | |
| `due_date` | DATE | |
| `payment_status` | VARCHAR(20) DEFAULT `'Unpaid'` | |
| `notes` | TEXT | |
| `status` | VARCHAR(20) DEFAULT `'active'` | |
| `created_at` | TIMESTAMPTZ | |

### `purchase_return_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `return_id` | INT FK → `purchase_returns.id` ON DELETE CASCADE | |
| `product_id` | INT | No FK (historical flexibility) |
| `name` | VARCHAR(255) | |
| `qty` | DECIMAL(12,3) | |
| `rate`, `amount` | DECIMAL(12,2) | |
| `unit` | VARCHAR(50) | |
| `gst_rate` | DECIMAL(5,2) | |
| `gst_amount` | DECIMAL(12,2) | |
| `created_at` | TIMESTAMPTZ | |

---

## Payments & Cash

### `payment_in_history`

Standalone payment receipts from customers (not tied to a specific invoice).

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `party_id` | INT FK → `parties.id` ON DELETE SET NULL | |
| `party_name` | VARCHAR(255) | |
| `amount` | DECIMAL(12,2) | |
| `discount` | DECIMAL(12,2) DEFAULT 0 | Settlement discount given |
| `payment_mode` | VARCHAR(100) | |
| `reference` | VARCHAR(100) | Cheque/UPI ref |
| `notes` | TEXT | |
| `date` | DATE DEFAULT CURRENT_DATE | |
| `status` | VARCHAR(20) DEFAULT `'Unused'` | `'Unused'` / `'Applied'` |
| `created_at` | TIMESTAMPTZ | |

### `payment_out_history`

Standalone payments made to suppliers. Same structure as `payment_in_history`.

### `cash_transactions`

Daily cashbook ledger entries.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `date` | DATE DEFAULT CURRENT_DATE | |
| `type` | VARCHAR(50) | `'in'` / `'out'` or custom description |
| `amount` | DECIMAL(12,2) | |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `bank_accounts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `bank_name` | VARCHAR(255) | |
| `account_no` | VARCHAR(50) | |
| `ifsc` | VARCHAR(20) | |
| `type` | VARCHAR(20) DEFAULT `'Current'` | Savings / Current |
| `balance` | DECIMAL(14,2) DEFAULT 0 | Current balance |
| `created_at` | TIMESTAMPTZ | |

### `cheques`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `party_id` | INT FK → `parties.id` ON DELETE SET NULL | |
| `party_name` | VARCHAR(255) | |
| `amount` | DECIMAL(12,2) | |
| `cheque_no` | VARCHAR(50) | |
| `bank` | VARCHAR(255) | |
| `issue_date` | DATE | |
| `due_date` | DATE | Clearance date |
| `type` | VARCHAR(5) | `'in'` (received) / `'out'` (issued) |
| `status` | VARCHAR(10) DEFAULT `'pending'` | `'pending'`, `'cleared'`, `'bounced'` |
| `created_at` | TIMESTAMPTZ | |

---

## Accounting & Assets

### `expenses`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `date` | DATE DEFAULT CURRENT_DATE | |
| `category` | VARCHAR(100) | Free-text; mirrors `expense_categories.name` |
| `description` | TEXT | |
| `amount` | DECIMAL(12,2) | Total expense |
| `paid_amount` | DECIMAL(12,2) | Amount settled |
| `payment_mode` | VARCHAR(50) | |
| `reference` | VARCHAR(100) | |
| `notes` | TEXT | |
| `party_id` | INT FK → `parties.id` | Optional supplier linkage |
| `created_at` | TIMESTAMP | |

**Indexes:** `date`

### `expense_categories`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(100) UNIQUE | |
| `type` | VARCHAR(20) DEFAULT `'Indirect'` | Direct / Indirect |
| `color` | VARCHAR(80) DEFAULT `'bg-slate-100 text-slate-600'` | Tailwind class string |
| `created_at` | TIMESTAMP | |

### `fixed_assets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) | |
| `category` | VARCHAR(100) DEFAULT `'General'` | |
| `purchase_date` | DATE | |
| `purchase_value` | DECIMAL(14,2) | Original cost |
| `current_value` | DECIMAL(14,2) | Book value after depreciation |
| `depreciation_rate` | DECIMAL(5,2) | Annual % |
| `depreciation_type` | VARCHAR(20) DEFAULT `'straight-line'` | `'straight-line'` or `'written-down-value'` |
| `serial_no` | VARCHAR(100) | |
| `location` | VARCHAR(200) | |
| `vendor` | VARCHAR(200) | |
| `warranty_expiry` | DATE | |
| `status` | VARCHAR(20) DEFAULT `'Active'` | Active / Disposed / etc. |
| `notes` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | |

### `capital_investments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `investor_name` | VARCHAR(255) | |
| `type` | VARCHAR(20) CHECK | `'Director'`, `'Promoter'`, `'Investor'` |
| `contact_number` | VARCHAR(20) | |
| `email` | VARCHAR(255) | |
| `address` | TEXT | |
| `investment_amount` | DECIMAL(15,2) | |
| `equity_percent` | DECIMAL(5,2) | Ownership % |
| `investment_date` | DATE | |
| `payment_mode` | VARCHAR(50) | |
| `reference_no` | VARCHAR(100) | |
| `notes` | TEXT | |
| `status` | VARCHAR(20) DEFAULT `'Active'` | `'Active'`, `'Inactive'`, `'Pending'` |
| `created_at`, `updated_at` | TIMESTAMP | |

### `loan_accounts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) | Loan name / identifier |
| `lender_name` | VARCHAR(255) | |
| `principal` | DECIMAL(14,2) | Original loan amount |
| `interest_rate` | DECIMAL(5,2) | Annual interest % |
| `emi` | DECIMAL(12,2) | Monthly instalment |
| `start_date` | DATE | |
| `duration_months` | INTEGER | |
| `payment_mode` | VARCHAR(50) | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `loan_transactions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `loan_id` | INT FK → `loan_accounts.id` ON DELETE CASCADE | |
| `type` | VARCHAR(50) | EMI / Prepayment / Charge / etc. |
| `principal` | DECIMAL(12,2) | Principal component |
| `interest` | DECIMAL(12,2) | Interest component |
| `other_charges` | DECIMAL(12,2) | Processing fee, penalty, etc. |
| `total_amount` | DECIMAL(12,2) | |
| `payment_mode` | VARCHAR(50) | |
| `reference_no` | VARCHAR(100) | |
| `charge_type` | VARCHAR(100) | |
| `transaction_date` | DATE | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

---

## HR & Payroll

### `designations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(100) UNIQUE | |
| `created_at` | TIMESTAMP | |

### `employees`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `employee_code` | VARCHAR(50) UNIQUE | |
| `name` | VARCHAR(150) NOT NULL | |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(150) | |
| `designation` | VARCHAR(100) | Free-text; mirrors `designations.name` |
| `department` | VARCHAR(100) | |
| `date_of_joining` | DATE | |
| `salary_type` | VARCHAR(20) DEFAULT `'perMonth'` | `'perMonth'` / `'perDay'` |
| `employee_type` | VARCHAR(20) DEFAULT `'dailyWages'` | `'dailyWages'` / `'salaried'` |
| `basic_salary` | DECIMAL(12,2) DEFAULT 0 | |
| **Allowances** | | |
| `hra` | DECIMAL(12,2) DEFAULT 0 | House Rent Allowance |
| `da` | DECIMAL(12,2) DEFAULT 0 | Dearness Allowance |
| `ta` | DECIMAL(12,2) DEFAULT 0 | Travel Allowance |
| `medical_allowance` | DECIMAL(12,2) DEFAULT 0 | |
| `special_allowance` | DECIMAL(12,2) DEFAULT 0 | |
| **Deductions** | | |
| `pf` | DECIMAL(12,2) DEFAULT 0 | Provident Fund |
| `esi` | DECIMAL(12,2) DEFAULT 0 | Employee State Insurance |
| `provisional_tax` | DECIMAL(12,2) DEFAULT 0 | |
| `tds` | DECIMAL(12,2) DEFAULT 0 | Tax Deducted at Source |
| `loan_recovery` | DECIMAL(12,2) DEFAULT 0 | |
| `address` | TEXT | |
| `notes` | TEXT | |
| `is_active` | BOOLEAN DEFAULT TRUE | |
| `created_at`, `updated_at` | TIMESTAMP | |

**Indexes:** `name`

### `attendance_records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `employee_id` | INT FK → `employees.id` ON DELETE CASCADE | |
| `date` | DATE | |
| `status` | VARCHAR(20) | Present / Absent / Half-Day / Leave / etc. |
| `note` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | |

**Unique:** `(employee_id, date)` — one record per employee per day  
**Indexes:** `date`

### `salary_records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `employee_id` | INT FK → `employees.id` ON DELETE CASCADE | |
| `type` | VARCHAR(20) | Salary / Advance / Deduction / etc. |
| `amount` | DECIMAL(12,2) | |
| `previous_salary` | DECIMAL(12,2) | For revision history |
| `effective_date` | DATE | |
| `paid_date` | DATE | |
| `pay_status` | VARCHAR(20) DEFAULT `'unpaid'` | `'unpaid'` / `'paid'` |
| `description` | TEXT | |
| `created_at` | TIMESTAMP | |

**Indexes:** `employee_id`

### `leave_types`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(50) UNIQUE | Casual Leave, Sick Leave, Annual Leave, Maternity Leave, Loss of Pay |
| `code` | VARCHAR(10) UNIQUE | CL, SL, AL, ML, LOP |
| `annual_allotment` | INT DEFAULT 0 | Days allotted per year |
| `is_paid` | BOOLEAN DEFAULT TRUE | |
| `is_active` | BOOLEAN DEFAULT TRUE | |
| `color` | VARCHAR(20) DEFAULT `'blue'` | |
| `created_at` | TIMESTAMP | |

### `leave_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `employee_id` | INT FK → `employees.id` ON DELETE CASCADE | |
| `leave_type_id` | INT FK → `leave_types.id` | |
| `from_date` | DATE | |
| `to_date` | DATE | |
| `days` | DECIMAL(4,1) | Supports half-day (0.5) |
| `reason` | TEXT | |
| `status` | VARCHAR(20) DEFAULT `'pending'` | `'pending'`, `'approved'`, `'rejected'` |
| `approved_by` | VARCHAR(100) | |
| `remarks` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | |

**Indexes:** `employee_id`, `from_date`

---

## User Management & RBAC

### `app_roles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(50) UNIQUE | Admin, Manager, Cashier, etc. |
| `description` | TEXT | |
| `is_system` | BOOLEAN DEFAULT FALSE | System roles cannot be deleted |
| `created_at` | TIMESTAMP | |

### `app_permissions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `module` | VARCHAR(50) | sales, purchases, inventory, hr, accounts, etc. |
| `action` | VARCHAR(50) | view, create, edit, delete, approve |
| `description` | TEXT | |

**Unique:** `(module, action)`

### `app_role_permissions`

Junction table — assigns permissions to roles.

| Column | Type | Notes |
|--------|------|-------|
| `role_id` | INT FK → `app_roles.id` ON DELETE CASCADE | |
| `permission_id` | INT FK → `app_permissions.id` ON DELETE CASCADE | |

**Primary Key:** `(role_id, permission_id)`

### `app_users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(100) | |
| `email` | VARCHAR(150) UNIQUE | Login credential |
| `phone` | VARCHAR(20) | |
| `password_hash` | TEXT | bcrypt hash |
| `role_id` | INT FK → `app_roles.id` | |
| `is_active` | BOOLEAN DEFAULT TRUE | |
| `last_login` | TIMESTAMP | |
| `created_at`, `updated_at` | TIMESTAMP | |

---

## System Tables

### `audit_log`

Immutable event log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `log_time` | TIMESTAMPTZ DEFAULT NOW() | |
| `user_name` | VARCHAR(100) | Who performed the action |
| `action` | VARCHAR(100) | CREATE_SALE, DELETE_PRODUCT, etc. |
| `details` | JSONB | Full payload / diff |

### `recycle_bin`

Soft-delete store with full record snapshots.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `type` | VARCHAR(50) | `Sale`, `Purchase`, `PaymentIn`, `PaymentOut`, `Party`, `Item` |
| `entity_id` | INT | Original PK |
| `name` | VARCHAR | Human-readable label (invoice no, party name, etc.) |
| `amount` | DECIMAL(12,2) | For quick display |
| `deleted_at` | TIMESTAMP DEFAULT NOW() | |
| `snapshot` | TEXT | Full JSON of the deleted record |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Line items store name/rate snapshots | Prices change; historical invoices must remain accurate |
| `parties.balance` and `payable` are denormalised running totals | Fast balance lookup without summing transactions on every read |
| `sale_items.product_id` is nullable (SET NULL on delete) | Product deletion does not orphan invoice history |
| `settings` is a singleton (id=1) | Shop configuration is global; avoids key-value sprawl |
| `recycle_bin` stores full JSON snapshot | Enables restore without needing full audit trail replay |
| `attendance_records` has unique `(employee_id, date)` | Prevents duplicate attendance entries |
| Employee salary components are flat columns | Simplifies payroll calculation queries |
