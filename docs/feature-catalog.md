# SuperMart Platform — Feature Catalog & Data-Model Blueprint

> **Purpose of this document.** A single, exhaustive catalog of every feature in the
> application — inferred from the React client (`client/src`), the server routes
> (`server/src/routes`), and the existing migrations (`db/migrations`). Features that the
> client *implies but does not yet implement* (e.g. the dozens of report stubs) are
> included and flagged. Each feature lists the **entities, fields, relationships, and
> normalization notes** required to turn it into a clean relational data model.
>
> **Strategic shift.** The current code is hard-coded for a single shop
> ("Gramathaankadai"). This document re-frames the product as a **multi-tenant SaaS
> SuperMart platform**: the platform onboards *merchants* (a.k.a. tenants / customers).
> "Gramathaankadai" becomes **one tenant** that signs up and uses the app. Every business
> feature below is therefore **tenant-scoped**, and a new **Platform layer** is added on
> top for onboarding, subscriptions, and platform administration.

---

## Status Legend

| Mark | Meaning |
|------|---------|
| ✅ | Implemented in the current client + server + DB |
| 🟡 | Partially present / stubbed in the client (UI route exists, logic/data missing) |
| 🔵 | Inferred / missing — expected in a real SuperMart product, **proposed here** |
| 🧱 | Normalization or multi-tenancy change proposed on an existing table |

---

## Table of Contents

1. [Multi-Tenancy Architecture](#1-multi-tenancy-architecture)
2. [Platform Layer (SaaS Control Plane)](#2-platform-layer-saas-control-plane)
3. [Tenant Onboarding & Configuration](#3-tenant-onboarding--configuration)
4. [Identity, Users & RBAC](#4-identity-users--rbac)
5. [Employee Management & Payroll (HR)](#5-employee-management--payroll-hr)
6. [Catalog & Inventory](#6-catalog--inventory)
7. [Parties (Customers & Suppliers)](#7-parties-customers--suppliers)
8. [Sales & POS](#8-sales--pos)
9. [Purchases](#9-purchases)
10. [Returns (Credit & Debit Notes)](#10-returns-credit--debit-notes)
11. [Payments, Cash & Banking](#11-payments-cash--banking)
12. [Accounting & Assets](#12-accounting--assets)
13. [Expenses & Other Income](#13-expenses--other-income)
14. [Loyalty Programme](#14-loyalty-programme)
15. [Taxes & GST Compliance](#15-taxes--gst-compliance)
16. [Reports & Analytics](#16-reports--analytics)
17. [Utilities (Import / Export / Barcode / Recycle Bin)](#17-utilities)
18. [System: Audit, Backup, Notifications](#18-system-audit-backup-notifications)
19. [Cross-Cutting Normalization Summary](#19-cross-cutting-normalization-summary)
20. [Proposed Entity Inventory (Quick Reference)](#20-proposed-entity-inventory-quick-reference)

---

## 1. Multi-Tenancy Architecture

**Goal:** isolate every merchant's data while sharing one application + database.

### 1.1 Tenancy model 🔵

- **Strategy:** single database, **shared-schema with a `tenant_id` discriminator** on every
  business table (lowest ops cost; supports thousands of small shops). A `tenant_id`
  column + composite indexes `(tenant_id, …)` everywhere. (Alternative: schema-per-tenant —
  document the choice but recommend shared-schema for this scale.)
- **Every business entity gains `tenant_id BIGINT NOT NULL FK → tenants.id`.** 🧱
- All **UNIQUE** constraints that are currently global must become **scoped**:
  - `products.item_code` → `UNIQUE (tenant_id, item_code)`
  - `sales.invoice` → `UNIQUE (tenant_id, invoice)`
  - `categories.name`, `designations.name`, `leave_types.code`, `app_roles.name`,
    `app_users.email`, `expense_categories.name`, `estimates.estimate_no`, etc. → all
    become `UNIQUE (tenant_id, …)`. 🧱
- **Row-Level Security** (Postgres RLS) recommended: a session GUC `app.tenant_id` enforces
  isolation at the DB layer so an application bug can't leak cross-tenant data.
- **Sequences per tenant:** invoice numbers, estimate numbers, employee codes etc. must
  reset/sequence **per tenant**, not globally. Introduce a `number_sequences` table
  (see §3.4).

### 1.2 Core tenancy entities 🔵

**`tenants`** — one merchant/shop business that onboarded onto the platform.

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `slug` | VARCHAR(60) UNIQUE | URL/subdomain identifier (e.g. `gramathaankadai`) |
| `legal_name` | VARCHAR(255) | Registered firm name |
| `display_name` | VARCHAR(255) | Brand / shop name shown in UI |
| `business_type` | VARCHAR(50) | Retail, Wholesale, Distributor, Restaurant… |
| `status` | VARCHAR(20) | `trial`, `active`, `suspended`, `cancelled` |
| `owner_user_id` | BIGINT FK → `app_users.id` | Primary owner login |
| `plan_id` | BIGINT FK → `plans.id` | Current subscription plan |
| `country` | VARCHAR(2) DEFAULT `'IN'` | ISO country (drives tax engine) |
| `default_currency` | VARCHAR(3) DEFAULT `'INR'` | |
| `default_timezone` | VARCHAR(50) DEFAULT `'Asia/Kolkata'` | |
| `locale` | VARCHAR(10) DEFAULT `'en-IN'` | |
| `onboarded_at` | TIMESTAMPTZ | |
| `trial_ends_at` | TIMESTAMPTZ | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

> The current **`settings` singleton (id=1)** is effectively *one tenant's* identity +
> config. In the new model: shop identity (shop_name, firm_name, address, gstin, state,
> phone) moves onto `tenants` + `tenant_locations`; behavioural config stays in a
> per-tenant `tenant_settings` row (see §3). 🧱

**`tenant_locations`** 🔵 — a tenant may have multiple stores/branches/warehouses.

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `tenant_id` | BIGINT FK | |
| `name` | VARCHAR(150) | "Main Store", "Warehouse 2" |
| `type` | VARCHAR(20) | `store`, `warehouse`, `counter` |
| `address`, `pincode`, `state`, `phone` | | |
| `gstin` | VARCHAR(20) | GSTIN can be per-location |
| `is_default` | BOOLEAN | |
| `is_active` | BOOLEAN | |

> Adding locations also unlocks the stubbed **Stock Transfer** report (§16) and
> location-scoped stock (§6).

---

## 2. Platform Layer (SaaS Control Plane)

The control plane is operated by **you** (the platform owner), not the merchant.

### 2.1 Platform staff & super-admin 🔵

**`platform_users`** — platform operators (support, sales, billing admins). Kept separate
from tenant `app_users` so a tenant breach never exposes platform access.

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `name`, `email` UNIQUE, `password_hash` | | |
| `platform_role` | VARCHAR(30) | `super_admin`, `support`, `billing`, `read_only` |
| `is_active`, `last_login`, `created_at` | | |

### 2.2 Subscription plans & feature gating 🔵

**`plans`** — what a tenant can subscribe to.

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `code` | VARCHAR(40) UNIQUE | `free`, `starter`, `growth`, `enterprise` |
| `name` | VARCHAR(100) | |
| `price_monthly`, `price_yearly` | DECIMAL(10,2) | |
| `currency` | VARCHAR(3) | |
| `trial_days` | INT | |
| `is_active` | BOOLEAN | |

**`plan_features` / `plan_limits`** — feature flags + quotas per plan (max users, max
products, max locations, GST reports on/off, etc.).

| Field | Type | Notes |
|-------|------|-------|
| `plan_id` | BIGINT FK | |
| `feature_key` | VARCHAR(60) | `loyalty`, `gst_reports`, `multi_location`, `payroll`… |
| `is_enabled` | BOOLEAN | |
| `limit_value` | INT NULL | NULL = unlimited |

> PK `(plan_id, feature_key)`.

### 2.3 Subscriptions, invoices & payments (platform billing) 🔵

**`subscriptions`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `tenant_id` | BIGINT FK | |
| `plan_id` | BIGINT FK | |
| `status` | VARCHAR(20) | `trialing`, `active`, `past_due`, `cancelled` |
| `billing_cycle` | VARCHAR(10) | `monthly`, `yearly` |
| `current_period_start`, `current_period_end` | TIMESTAMPTZ | |
| `cancel_at_period_end` | BOOLEAN | |
| `external_ref` | VARCHAR(100) | Razorpay/Stripe subscription id |

**`platform_invoices`** + **`platform_payments`** — billing the *tenant* for the SaaS
itself (distinct from the tenant's own sales invoices). Standard header/amount/status/
gateway-reference shape.

### 2.4 Tenant lifecycle & support 🔵

- **Provisioning / suspension / cancellation** transitions on `tenants.status`.
- **`tenant_activity`** — platform-side audit of onboarding, plan changes, suspensions.
- **`support_tickets`** (optional) — `tenant_id`, subject, status, priority, messages.

---

## 3. Tenant Onboarding & Configuration

### 3.1 Onboarding wizard 🔵

A guided first-run flow (currently implied only by the bare `settings/General` page):
1. Create tenant + owner account (sign-up).
2. Capture business identity (name, GSTIN, state, address) → `tenants` + `tenant_locations`.
3. Choose plan / start trial → `subscriptions`.
4. Seed defaults: roles & permissions, default UoMs, payment modes, leave types, expense
   categories, tax slabs (see seed tables below).
5. Optional data import (items, parties) via Utilities (§17).

> No new table strictly required beyond `tenants`; track progress with
> `tenants.onboarding_step` or an `onboarding_state` JSONB column.

### 3.2 `tenant_settings` 🧱 (replaces the `settings` singleton)

One row per tenant. Keep the existing grouped config but **normalize the embedded JSON
arrays out**:

| Group | Fields (kept) |
|-------|---------------|
| Invoicing | `invoice_prefix`, `next_invoice_no` (→ prefer `number_sequences`), `currency` |
| Tax | `tax_method`, `tax_default_gst_rate`, `tax_round_off`, `tax_supply_type`, `tax_business_type`, `tax_composition_rate`, TCS/TDS/Cess flags |
| Transactions | `credit_days`, `allow_negative_stock`, `decimal_qty`, returns flags |
| Parties | `default_party_type`, `require_gstin`, `credit_limit`, `duplicate_check`, `balance_display` |
| Items | `default_uom`, batch/expiry/MRP/HSN/location enable flags, `barcode_type` |
| Units | `unit_conversion_enabled` |
| Print | the ~20 `print_show_*` boolean flags |

**Normalize out of the singleton:** 🧱
- `settings.payment_modes` (JSON array) → the existing **`payment_modes`** table (now
  tenant-scoped) — already modelled, just enforce it as the source of truth.
- `tax_active_slabs` / `tax_custom_slabs` (JSONB) → **`tax_slabs`** table (§15), tenant-scoped.
- Print flags could move to a `print_templates` table if multiple templates are needed.

### 3.3 Reference / seed data (all tenant-scoped) 🧱

Each new tenant is seeded with copies of: `uom_list`, `uom_conversions`, `payment_modes`,
`payment_type_settings`, `leave_types`, `expense_categories`, `app_roles` + `app_permissions`,
`tax_slabs`. All gain `tenant_id`. ✅(exist) 🧱(scope them)

### 3.4 `number_sequences` 🔵 (per-tenant document numbering)

Replaces ad-hoc `invoice_prefix` + max()+1 logic and the global `estimates.estimate_no`.

| Field | Type | Notes |
|-------|------|-------|
| `tenant_id` | BIGINT FK | |
| `doc_type` | VARCHAR(30) | `sale`, `purchase`, `estimate`, `credit_note`, `debit_note`, `payment_in`, `payment_out`, `employee` |
| `prefix` | VARCHAR(20) | |
| `next_value` | BIGINT | |
| `padding` | INT | Zero-pad width |

> PK `(tenant_id, doc_type)`. Eliminates duplicate-invoice race conditions per tenant.

---

## 4. Identity, Users & RBAC

✅ Implemented today (`app_users`, `app_roles`, `app_permissions`,
`app_role_permissions`) but **single-tenant and weak on auth**.

### 4.1 Users ✅🧱

**`app_users`** gains `tenant_id` 🧱. Login becomes scoped: `UNIQUE (tenant_id, email)`.
A user belongs to exactly one tenant (simplest); a `user_tenant_memberships` join is the
upgrade path if one person manages several shops.

Existing fields: `name, email, phone, password_hash, role_id, is_active, last_login,
created_at, updated_at`. **Add:** 🔵
- `password_reset_token`, `password_reset_expires`
- `email_verified_at`
- `failed_login_count`, `locked_until` (brute-force protection)
- `must_change_password`
- `avatar_url`
- `employee_id` BIGINT FK → `employees.id` (link a login to an HR employee record)

### 4.2 Roles ✅🧱

**`app_roles`** gains `tenant_id`. Client uses roles **Owner, Admin, Manager, Accountant,
Sales Staff, Viewer** (`usermanagement/index.jsx`). `is_system` protects seeded roles;
"Owner" is non-editable (full access). Add `color` for UI (already used client-side via a
constant map — persist it). 🔵

### 4.3 Permissions ✅🧱

**`app_permissions`**: `(module, action)`. Client modules:
`sales, purchases, items, parties, reports, accounts, settings, users`; actions:
`view, create, edit, delete`. **Extend** to cover all real modules: 🔵
- modules: add `pos, employees, expenses, cashbook, loyalty, banking, taxes, utilities, backup`
- actions: add `approve`, `export`, `void/cancel`, `restore`

> `app_permissions` is a **global catalog** (not tenant-scoped); `app_role_permissions`
> links tenant roles → catalog permissions. Keep `(module, action)` UNIQUE globally.

### 4.4 Sessions / auth tokens 🔵

Client currently fakes auth with `localStorage.user` (`App.jsx` `RequireAuth`). Real
product needs:

**`user_sessions`** / refresh tokens: `id, user_id, tenant_id, token_hash, ip, user_agent,
expires_at, revoked_at, created_at`. Supports "log out everywhere", device list, and
secure JWT/refresh rotation.

### 4.5 User activity 🟡

`activityLog` API + `audit_log` table exist (§18). Per-user "last login" is shown in the
drawer ✅. Tie `audit_log.user_name` → `audit_log.user_id` FK. 🧱

---

## 5. Employee Management & Payroll (HR)

✅ Strong existing module: `employees`, `designations`, `attendance_records`,
`salary_records`, `leave_types`, `leave_requests`. All gain `tenant_id` 🧱.

### 5.1 Employees ✅🧱

Keep `employees` core fields. **Normalize:** 🧱
- `designation` (free-text) → `designation_id` FK → `designations.id`.
- `department` (free-text) → new **`departments`** table (`id, tenant_id, name`). 🔵
- **Salary components are flat columns** (`hra, da, ta, medical_allowance,
  special_allowance, pf, esi, provisional_tax, tds, loan_recovery`). Migration V20 already
  formalizes the structure. For flexibility, **propose** a `salary_components` /
  `employee_salary_structure` table: 🔵

  **`salary_components`**: `id, tenant_id, name, type (earning|deduction),
  calc_type (fixed|percent_of_basic), is_active`.
  **`employee_salary_structure`**: `id, tenant_id, employee_id, component_id, amount,
  effective_from`. (Keeps the current columns working but enables custom components.)

**Add fields:** 🔵 `gender`, `dob`, `bank_account_no`, `ifsc`, `pan`, `aadhaar` (masked),
`uan` (PF), `esic_no`, `emergency_contact`, `photo_url`, `date_of_exit`, `exit_reason`.

### 5.2 Attendance ✅🧱

`attendance_records` with `UNIQUE (employee_id, date)` → `UNIQUE (tenant_id, employee_id,
date)`. **Add:** 🔵 `check_in`, `check_out`, `worked_hours`, `overtime_hours`,
`shift_id`, `location_id`. Optional **`shifts`** table (`name, start_time, end_time`).

### 5.3 Salary / payroll ✅🧱

`salary_records` (type Salary/Advance/Deduction, amount, effective/paid dates, pay_status).
**Propose a proper payroll run model:** 🔵
- **`payroll_runs`**: `id, tenant_id, period_month, period_year, status (draft|finalized|paid),
  total_gross, total_deductions, total_net, run_date`.
- **`payslips`**: `id, tenant_id, payroll_run_id, employee_id, gross, total_earnings,
  total_deductions, net_pay, days_present, days_lop, status`.
- **`payslip_lines`**: `id, payslip_id, component_id, label, type, amount`.
- Keep `salary_records` as the **advances/ad-hoc ledger** feeding `loan_recovery`.
  ("Salary Ledger" page = per-employee transaction view.) ✅

### 5.4 Leave management ✅🧱

`leave_types` + `leave_requests`. **Add leave balances** so allotment is enforced: 🔵
- **`leave_balances`**: `id, tenant_id, employee_id, leave_type_id, year, allotted, used,
  carried_forward, balance`. UNIQUE `(tenant_id, employee_id, leave_type_id, year)`.
- `leave_requests.approved_by` (free-text) → `approved_by_user_id` FK. 🧱

---

## 6. Catalog & Inventory

✅ `products`, `categories`, `uom_list`, `uom_conversions`. Client pages: Items list,
Add/Edit item, Bulk action, Import, Categories, Units, Services, Item Transactions.

### 6.1 Products / items ✅🧱

All `products` fields kept; add `tenant_id`. **Normalize the free-text `category`** →
`category_id` FK → `categories.id` 🧱 (the `categories` table already exists but products
store a string copy).

**Sub-features inferred from the client:**
- **Services vs. Products** (`items/services.jsx`) — `products.type` already distinguishes
  `Product`/`Service`. ✅
- **Bulk / dual-unit selling** (`is_bulk`, `secondary_unit`, `pcs_per_unit`). ✅
- **Pricing tiers**: `purchase_price`, `mrp`, `sales_price`, `wholesale_price`/
  `wholesale_qty`, `at_price`. 🔵 *Propose* a `product_prices` table if more than three
  tiers or customer-group pricing is needed; otherwise keep flat.
- **Item Transactions** (`items/ItemTransactions.jsx`) — needs a **stock ledger** (below).

### 6.2 Stock, batches & locations 🔵🧱

Today stock is a single `products.stock` number, with `batch`/`expiry_date` as flat fields,
and line items carry `batch_no/exp_date/mfg_date`. A real SuperMart needs:

**`stock_ledger`** (the backbone for "Item Transactions", stock reports, valuation):

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `tenant_id` | BIGINT FK | |
| `product_id` | BIGINT FK | |
| `location_id` | BIGINT FK NULL | branch/warehouse |
| `batch_id` | BIGINT FK NULL | |
| `txn_type` | VARCHAR(20) | `purchase`, `sale`, `sale_return`, `purchase_return`, `adjustment`, `transfer`, `opening` |
| `ref_table`, `ref_id` | | Source document |
| `qty_in`, `qty_out` | DECIMAL(12,3) | |
| `rate` | DECIMAL(12,2) | Valuation rate |
| `balance_qty` | DECIMAL(12,3) | Running balance |
| `created_at` | TIMESTAMPTZ | |

**`product_batches`** 🔵: `id, tenant_id, product_id, batch_no, mfg_date, expiry_date,
mrp, location_id, qty_on_hand`. Unlocks the stubbed **Item Batch Report** & expiry tracking.

**`stock_adjustments`** 🔵: header for manual stock corrections (damage, count, opening).
**`stock_transfers`** 🔵: `id, tenant_id, from_location_id, to_location_id, date, status` +
`stock_transfer_items` — unlocks the stubbed **Stock Transfer Report**.

### 6.3 Manufacturing / BOM 🔵 (report stubs reference it)

Stubs **Manufacturing Report** + **Consumption Report** imply assembled/made items:
- **`bill_of_materials`**: `id, tenant_id, product_id (output), output_qty`.
- **`bom_components`**: `bom_id, component_product_id, qty`.
- **`manufacturing_orders`** + consumption postings into `stock_ledger`.

### 6.4 Units of measure ✅🧱

`uom_list` + `uom_conversions` kept, gain `tenant_id`; `code` UNIQUE becomes
`(tenant_id, code)`.

---

## 7. Parties (Customers & Suppliers)

✅ `parties` (unified customer/supplier/both, B2B/B2C). Pages: list, Add party, Loyalty,
Import/Export.

### 7.1 Parties ✅🧱

Add `tenant_id`. Keep denormalized `balance` / `payable` as **fast running totals**, but
back them with a ledger so they're auditable/reconcilable: 🔵

**`party_ledger`** (unlocks **Party Statement** report stub):

| Field | Type | Notes |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `tenant_id`, `party_id` | FK | |
| `date` | DATE | |
| `txn_type` | VARCHAR(20) | `sale`, `purchase`, `payment_in`, `payment_out`, `credit_note`, `debit_note`, `opening` |
| `ref_table`, `ref_id` | | |
| `debit`, `credit` | DECIMAL(12,2) | |
| `balance` | DECIMAL(12,2) | Running |

**Add party fields:** 🔵 `party_code`, `credit_limit`, `credit_days`, `opening_balance`,
`opening_balance_type`, `billing_state`, `is_active`, `party_group_id` (below).

### 7.2 Party groups 🔵

Report stub **"Sale Purchase by Party Group"** ⇒ **`party_groups`**:
`id, tenant_id, name`. `parties.party_group_id` FK.

---

## 8. Sales & POS

✅ `sales` + `sale_items`, `estimates` + `estimate_items`, POS page, Sales History,
Payment In, Sale Return. All gain `tenant_id`.

### 8.1 Sales invoices ✅🧱

`sales` header + `sale_items` lines. Keep **price/name snapshots** on line items (correct
design for historical accuracy). 🧱 changes:
- `party_id` already FK; `customer_name`/`phone`/addresses remain snapshots. ✅
- `invoice` UNIQUE → `(tenant_id, invoice)`; sourced from `number_sequences`.
- Add `location_id` FK (which store made the sale). 🔵
- Add `created_by_user_id` / `cashier_id` FK (who rang it up — needed for staff reports). 🔵
- Fix data types on `sale_items.exp_date`/`mfg_date` (currently VARCHAR) → `DATE`,
  or move batch detail to `product_batches` reference. 🧱

### 8.2 POS ✅🔵

`pos/index.jsx` is a full-screen quick-sale terminal. Backed by `sales`. **Propose POS
session/shift tracking** for cash reconciliation: 🔵
- **`pos_sessions`**: `id, tenant_id, location_id, cashier_user_id, opened_at, closed_at,
  opening_cash, closing_cash, expected_cash, variance, status`.
- Link `sales.pos_session_id`. Unlocks day-end Z-reports.

### 8.3 Estimates / quotations ✅🧱

`estimates` + `estimate_items`. `estimate_no` global UNIQUE → `(tenant_id, estimate_no)`,
or fold into `number_sequences`. Status `Open|Converted|Cancelled`; add
`converted_sale_id` FK to link a quotation to the sale it became. 🔵

### 8.4 Delivery / dispatch 🟡

`sales` already has `vehicle_no`, `delivery_date`, `delivery_location`,
`dispatch_location`. 🔵 *Propose* a light **`deliveries`** table if delivery status
tracking (dispatched/delivered) is wanted.

---

## 9. Purchases

✅ `purchases` + `purchase_items`, Purchase History, Payment Out, Purchase Return.
Add `tenant_id`. Keep supplier-invoice fields (`supplier_invoice_no/date`, `eway_bill_no`). 🧱

- `invoice` UNIQUE → `(tenant_id, invoice)`.
- `purchase_items` has **no `product_id`** (name snapshot only) → **add `product_id` FK**
  so purchases post to `stock_ledger` and feed item-wise reports. 🧱
- Add `location_id` (receiving store) and `created_by_user_id`. 🔵
- 🔵 *Propose* **`purchase_orders`** (PO → GRN → Purchase Invoice flow) for larger tenants:
  `purchase_orders` + `purchase_order_items`, status `draft|sent|received|closed`.

---

## 10. Returns (Credit & Debit Notes)

✅ `sale_returns` + `sale_return_items` (Credit Note), `purchase_returns` +
`purchase_return_items` (Debit Note). Add `tenant_id`; note numbers → `number_sequences`.

- Link returns to originals: `sale_returns.reference_invoice` (text) → add
  `original_sale_id` FK; same for purchase returns → `original_purchase_id`. 🧱
- `purchase_return_items.product_id` has no FK — keep nullable but **add FK** for reporting. 🧱
- Returns must post to `stock_ledger` and `party_ledger`. 🔵

---

## 11. Payments, Cash & Banking

✅ `payment_in_history`, `payment_out_history`, `cash_transactions`, `bank_accounts`,
`cheques`. Pages: Payment In/Out, Bank Accounts, Cash in Hand, Cheques, Day Cash Book +
History. Add `tenant_id` to all. 🧱

### 11.1 Payments in/out ✅🧱

Standalone receipts/payments with `status Unused|Applied`. The "Applied" state implies
**allocation to invoices** but there's no link table — **propose**: 🔵

**`payment_allocations`**: `id, tenant_id, payment_id, payment_direction (in|out),
target_table (sale|purchase), target_id, amount`. Enables partial settlement, "on-account"
balances, and accurate `payment_status` on invoices.

Add `bank_account_id` FK on payments (which account received/paid). 🔵

### 11.2 Cash book ✅🧱

`cash_transactions` (in/out ledger). Tie each entry to its source via `ref_table/ref_id`
so the Day Book reconciles to sales/expenses/payments rather than being free-floating. 🔵

### 11.3 Bank accounts & cheques ✅🧱

`bank_accounts` (balance), `cheques` (in/out, pending/cleared/bounced). 🔵 *Propose*
**`bank_transactions`** ledger to back the stubbed **Bank Statement** report and reconcile
`bank_accounts.balance`.

---

## 12. Accounting & Assets

✅ `fixed_assets`, `capital_investments`, `loan_accounts`, `loan_transactions`. Pages:
Fixed Assets, Capital Investment, Loan Accounts. Add `tenant_id`. 🧱

- **Fixed assets**: keep depreciation fields; 🔵 *propose* `asset_depreciation_schedule`
  (period, opening, depreciation, closing) to back balance-sheet asset values.
- **Capital investments**: keep; `equity_percent` supports a cap-table view.
- **Loans**: `loan_accounts` + `loan_transactions` (EMI/prepayment/charge). Backs the
  stubbed **Loan Statement** report. ✅
- 🔵 **General ledger (optional, for Trial Balance / P&L / Balance Sheet stubs):** to truly
  power those three report stubs you need **double-entry**:
  - **`chart_of_accounts`**: `id, tenant_id, code, name, type (asset|liability|equity|income|expense), parent_id`.
  - **`journal_entries`** + **`journal_lines`** (`account_id, debit, credit`).
  - Every business document posts a balanced journal entry. This is the single biggest
    "missing backbone" if full financial statements are a goal.

---

## 13. Expenses & Other Income

✅ `expenses` + `expense_categories`. Page: Expenses. Add `tenant_id`. Normalize
`expenses.category` (text) → `expense_category_id` FK. 🧱

🔵 **Other Income** — the report menu has **Other Income / Other Income Category / Other
Income Item** stubs but no UI/table. Propose mirror tables:
- **`other_incomes`** (`date, category_id, amount, received_amount, payment_mode,
  reference, party_id`) + **`other_income_categories`**.

---

## 14. Loyalty Programme

✅ Settings + `parties.loyalty_points` + Loyalty Points page. Config lives in
`tenant_settings` (points_per_rupee, min_points, points_value, expiry_days, max_discount,
allow_partial, show_on_invoice). 🧱

🔵 **Missing ledger** — points are a single balance with no history or expiry enforcement.
Propose **`loyalty_transactions`**: `id, tenant_id, party_id, sale_id NULL, type
(earn|redeem|expire|adjust), points, value, expires_at, created_at`. Enables the
`loyalty_expiry_days` setting to actually work and powers a loyalty statement.

---

## 15. Taxes & GST Compliance

✅ Tax config in settings; `tax_active_slabs`/`tax_custom_slabs` JSONB. Page: Settings →
Taxes & GST. India-centric (GSTIN, state-of-supply, CGST/SGST/IGST via `state_of_supply`).

🧱 **Normalize slabs out of JSON** → **`tax_slabs`**: `id, tenant_id, name, rate,
cgst, sgst, igst, cess, is_active`. Line items reference rate (already store `gst_rate`).

🔵 **GST returns backbone** — the report menu stubs **GSTR-1, GSTR-2, GSTR-3B, GSTR-9,
Sale by HSN, GST/GST-Rate reports, TDS/TCS receivable/payable**. These are *computed* from
sales/purchases + HSN + tax slabs; mostly they need **no new storage**, only:
- `products.hsn_code` (exists ✅) and reliable `gst_rate` per line (exists ✅).
- Optional **`gst_return_filings`** log: `id, tenant_id, return_type, period, status,
  filed_at, json_payload` to track what was filed.

---

## 16. Reports & Analytics

The client wires **~45 report routes**, of which only 5 are real (✅ Sale, Purchase, Day
Book, All Transactions, Bill-wise Profit) and the rest are `ReportStub` 🟡. They define the
**analytical surface** the data model must support. Grouped:

| Group | Reports (🟡 = stub) | Data backbone needed |
|-------|---------------------|----------------------|
| Transaction | Sale ✅, Purchase ✅, Day Book ✅, All Transactions ✅, Bill-wise Profit ✅, **Profit & Loss** 🟡, **Cash Flow** 🟡, **Trial Balance** 🟡, **Balance Sheet** 🟡 | sales/purchases + **journal/GL** (§12) for P&L/TB/BS |
| Party | **Party Statement** 🟡, Party-wise P&L 🟡, All Parties 🟡, Party by Item 🟡, Sale/Purchase by Party 🟡, by Party Group 🟡 | `party_ledger`, `party_groups` |
| GST | GSTR-1/2/3B/9 🟡, Sale by HSN 🟡 | sales/purchase tax lines + HSN |
| Item / Stock | Stock Summary 🟡, Item Batch 🟡, Item by Party 🟡, Item-wise P&L 🟡, Category P&L 🟡, Low Stock 🟡, Stock Detail 🟡, Item Detail 🟡, Sale/Purchase by Category 🟡, Stock by Category 🟡, Item-wise Discount 🟡, **Manufacturing** 🟡, **Consumption** 🟡, **Stock Transfer** 🟡 | `stock_ledger`, `product_batches`, `bom_*`, `stock_transfers`, `category_id` |
| Business Status | Bank Statement 🟡, Loan Statement 🟡, Discount Report 🟡 | `bank_transactions`, `loan_transactions` ✅ |
| Taxes | GST/GST-Rate 🟡, TDS/TCS receivable & payable 🟡 | tax lines + `tax_slabs` |
| Expense | Expense 🟡, Expense Category 🟡, Expense Item 🟡 | `expenses`, `expense_categories` |
| Other Income | Other Income (+ category/item) 🟡 | `other_incomes` (§13) |

> **Takeaway:** most stubs need **no bespoke tables** — they need the **ledgers**
> (`stock_ledger`, `party_ledger`, journal/GL) and the **FK normalizations** (category_id,
> product_id on purchases) listed above. Implement those backbones and ~80% of the stubbed
> reports become straightforward queries.

🔵 **Dashboard KPIs** (from `dashboard/index.jsx`): today's sales/purchases, totals, stock
value, low-stock count, near-expiry (≤30d) count, receivable, payable. No new tables — but
materialized views or a `daily_metrics` rollup table would speed these up at scale.

---

## 17. Utilities

✅/🟡 Pages: Import Items, Export Items, Import Parties, Export Parties, Barcode Generator,
Recycle Bin, Log Register.

- **Import/Export** (CSV/Excel of items & parties) — operational, not stored. 🔵 *Propose*
  an **`import_jobs`** table (`id, tenant_id, type, filename, rows_total, rows_ok,
  rows_failed, error_report, created_by, created_at`) for auditability.
- **Barcode generator** — uses `products.item_code` / `barcode_type` setting. No storage. ✅
- **Recycle Bin** ✅ — `recycle_bin` (type, entity_id, snapshot JSON). Add `tenant_id` +
  `deleted_by_user_id` + `restored_at`. 🧱
- **Log Register** ✅ — reads `audit_log` (§18).

---

## 18. System: Audit, Backup, Notifications

- **Audit log** ✅ `audit_log` (log_time, user_name, action, details JSONB). 🧱 Add
  `tenant_id`, `user_id` FK, `ip_address`, `entity_type`, `entity_id` for filterable
  Log Register.
- **Recycle bin** ✅ (see §17).
- **Backup** ✅ page + `backup` route. 🔵 *Propose* `backup_jobs` log (per-tenant export
  snapshots, scheduled/manual, storage URL, status) — important in multi-tenant ops.
- **Notifications** 🔵 (inferred, not present): low-stock alerts, cheque-due, payment-due,
  leave-approval. Propose **`notifications`** (`id, tenant_id, user_id, type, title, body,
  is_read, link, created_at`) + optional **`notification_preferences`**.
- **Reset Data** ✅ (`settings/Reset.jsx`, `reset` route) — must be **tenant-scoped** so a
  tenant can wipe only its own data. 🧱

---

## 19. Cross-Cutting Normalization Summary

The highest-value structural changes when converting to the data model:

1. **Add `tenant_id` to every business table** + scope all UNIQUE constraints to the tenant;
   enforce with RLS. 🧱 *(biggest change)*
2. **Replace the `settings` singleton** with `tenants` + `tenant_locations` + `tenant_settings`
   (one row per tenant). 🧱
3. **Per-tenant document numbering** via `number_sequences` (kills duplicate-invoice races
   and the global `estimate_no`). 🔵
4. **Free-text → FK normalizations:** 🧱
   - `products.category` → `category_id`
   - `employees.designation` → `designation_id`; `department` → `department_id`
   - `expenses.category` → `expense_category_id`
   - `sale_returns/purchase_returns.reference_invoice` → `original_sale_id/original_purchase_id`
   - `leave_requests.approved_by` → `approved_by_user_id`
   - `audit_log.user_name` → `user_id`
   - `purchase_items` / `purchase_return_items` → add `product_id` FK
5. **Introduce ledgers** (the analytical backbone): `stock_ledger`, `party_ledger`,
   `payment_allocations`, `loyalty_transactions`, and (for full financial statements)
   `chart_of_accounts` + `journal_entries`/`journal_lines`. 🔵
6. **Fix weak data types:** `sale_items.exp_date/mfg_date` (VARCHAR → DATE),
   monetary/qty already DECIMAL ✅. 🧱
7. **Keep intentional denormalizations:** line-item name/rate snapshots, and
   `parties.balance`/`payable` running totals — but make them *derivable* from the new
   ledgers for reconciliation. ✅
8. **Auth hardening tables:** `user_sessions`, password-reset/lockout fields. 🔵

---

## 20. Proposed Entity Inventory (Quick Reference)

Grouped list of every table the target model needs. ✅ exists · 🧱 exists + tenant/normalize
· 🔵 new.

**Platform / Tenancy**
`tenants` 🔵 · `tenant_locations` 🔵 · `tenant_settings` 🧱(was `settings`) ·
`number_sequences` 🔵 · `platform_users` 🔵 · `plans` 🔵 · `plan_features` 🔵 ·
`subscriptions` 🔵 · `platform_invoices` 🔵 · `platform_payments` 🔵 ·
`tenant_activity` 🔵 · `support_tickets` 🔵(optional)

**Identity & RBAC**
`app_users` 🧱 · `app_roles` 🧱 · `app_permissions` 🧱 · `app_role_permissions` 🧱 ·
`user_sessions` 🔵

**HR / Payroll**
`employees` 🧱 · `designations` 🧱 · `departments` 🔵 · `salary_components` 🔵 ·
`employee_salary_structure` 🔵 · `attendance_records` 🧱 · `shifts` 🔵 ·
`salary_records` 🧱 · `payroll_runs` 🔵 · `payslips` 🔵 · `payslip_lines` 🔵 ·
`leave_types` 🧱 · `leave_requests` 🧱 · `leave_balances` 🔵

**Catalog & Inventory**
`products` 🧱 · `categories` 🧱 · `uom_list` 🧱 · `uom_conversions` 🧱 ·
`product_prices` 🔵(optional) · `product_batches` 🔵 · `stock_ledger` 🔵 ·
`stock_adjustments` 🔵 · `stock_transfers` 🔵 · `stock_transfer_items` 🔵 ·
`bill_of_materials` 🔵 · `bom_components` 🔵 · `manufacturing_orders` 🔵

**Parties**
`parties` 🧱 · `party_groups` 🔵 · `party_ledger` 🔵

**Sales & POS**
`sales` 🧱 · `sale_items` 🧱 · `estimates` 🧱 · `estimate_items` 🧱 ·
`pos_sessions` 🔵 · `deliveries` 🔵(optional)

**Purchases**
`purchases` 🧱 · `purchase_items` 🧱 · `purchase_orders` 🔵(optional) ·
`purchase_order_items` 🔵(optional)

**Returns**
`sale_returns` 🧱 · `sale_return_items` 🧱 · `purchase_returns` 🧱 ·
`purchase_return_items` 🧱

**Payments / Cash / Bank**
`payment_in_history` 🧱 · `payment_out_history` 🧱 · `payment_allocations` 🔵 ·
`cash_transactions` 🧱 · `bank_accounts` 🧱 · `bank_transactions` 🔵 · `cheques` 🧱 ·
`payment_modes` 🧱 · `payment_type_settings` 🧱

**Accounting & Assets**
`fixed_assets` 🧱 · `asset_depreciation_schedule` 🔵 · `capital_investments` 🧱 ·
`loan_accounts` 🧱 · `loan_transactions` 🧱 · `chart_of_accounts` 🔵 ·
`journal_entries` 🔵 · `journal_lines` 🔵

**Expenses & Income**
`expenses` 🧱 · `expense_categories` 🧱 · `other_incomes` 🔵 · `other_income_categories` 🔵

**Loyalty & Tax**
`loyalty_transactions` 🔵 · `tax_slabs` 🔵 · `gst_return_filings` 🔵(optional)

**System**
`audit_log` 🧱 · `recycle_bin` 🧱 · `import_jobs` 🔵 · `backup_jobs` 🔵 ·
`notifications` 🔵 · `notification_preferences` 🔵(optional)

---

### How to use this file to build the data model

1. Start with **§1–§3** (tenancy + tenant config) — it changes the shape of *everything*.
2. Apply the **§19 normalization checklist** to the existing tables in `datmodel.dbml`.
3. Add the **ledgers** from §6/§7/§11/§12 — they unlock the §16 reports.
4. Layer in 🔵 modules per subscription plan (gate with `plan_features`).
5. Keep the existing `docs/data-model.md` / `datmodel.dbml` as the **"as-built v1"** and
   evolve a **"v2 multi-tenant"** DBML from the §20 inventory.
</content>
</invoke>
