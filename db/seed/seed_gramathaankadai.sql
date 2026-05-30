-- ════════════════════════════════════════════════════════════════════
-- Seed: default tenant "gramathaankadai" (v2 multi-tenant schema) — MySQL 8
-- Run against a freshly migrated DB:
--   docker compose exec -T mysql mysql -uroot -proot gramathaankadai_db \
--       < db/seed/seed_gramathaankadai.sql
-- (or:  pnpm db:seed )
--
-- Intended for a fresh DB (use `pnpm db:reset`). MySQL has no pgcrypto, so the
-- password hash below is a precomputed bcrypt ($2b$) hash for "1234",
-- verifiable by the app's node `bcrypt`.
-- Default login →  admin@gramathaankadai.com / 1234
-- ════════════════════════════════════════════════════════════════════

SET @pwd := '$2b$10$rIr9Vl7HvGryu/Dx6ki/vONltUqlTw7zB8swCZmgW2itwfcddUjfu';

-- ── Plan + Tenant + Location + Settings + Subscription ──────────────
INSERT INTO plans (code, name, price_monthly, price_yearly, currency, trial_days)
VALUES ('growth', 'Growth', 999.00, 9990.00, 'INR', 14);
SET @plan_id := LAST_INSERT_ID();

INSERT INTO tenants (slug, legal_name, display_name, business_type, status, plan_id,
                     country, default_currency, onboarded_at)
VALUES ('gramathaankadai', 'Gramathaankadai Retail Pvt Ltd', 'Gramathaankadai SuperMart',
        'Retail', 'active', @plan_id, 'IN', 'INR', NOW());
SET @tenant_id := LAST_INSERT_ID();

INSERT INTO tenant_locations (tenant_id, name, type, address, pincode, state, phone, gstin, is_default)
VALUES (@tenant_id, 'Main Store', 'store', '12 Bazaar Road, Karur', '639001', 'Tamil Nadu',
        '+91 98765 43210', '33ABCDE1234F1Z5', TRUE);
SET @loc_id := LAST_INSERT_ID();

INSERT INTO tenant_settings (tenant_id, invoice_prefix, currency, tax_method,
                             tax_default_gst_rate, default_party_type, default_uom,
                             loyalty_enabled, loyalty_points_per_rupee, loyalty_points_value)
VALUES (@tenant_id, 'INV', 'INR', 'exclusive', 5, 'B2C', 'PCS', TRUE, 0.01, 1.00);

INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle,
                           current_period_start, current_period_end)
VALUES (@tenant_id, @plan_id, 'active', 'monthly', NOW(), NOW() + INTERVAL 30 DAY);

INSERT INTO number_sequences (tenant_id, doc_type, prefix, next_value, padding) VALUES
  (@tenant_id, 'sale',       'INV', 3, 4),
  (@tenant_id, 'purchase',   'PUR', 2, 4),
  (@tenant_id, 'estimate',   'EST', 1, 4),
  (@tenant_id, 'credit_note','CN',  1, 4),
  (@tenant_id, 'debit_note', 'DN',  1, 4);

-- ── Roles + Permission catalog + grants ────────────────────────────
INSERT INTO app_roles (tenant_id, name, description, is_system, color) VALUES
  (@tenant_id, 'Owner',       'Full access to everything',       TRUE,  'purple'),
  (@tenant_id, 'Admin',       'Manage all except owner settings',TRUE,  'red'),
  (@tenant_id, 'Manager',     'Manage sales, purchases, items',  FALSE, 'blue'),
  (@tenant_id, 'Accountant',  'Accounts and reports',            FALSE, 'green'),
  (@tenant_id, 'Sales Staff', 'Create and view sales only',      FALSE, 'amber'),
  (@tenant_id, 'Viewer',      'Read-only access',                FALSE, 'gray');

SELECT id INTO @owner_role FROM app_roles WHERE tenant_id = @tenant_id AND name = 'Owner';
SELECT id INTO @mgr_role   FROM app_roles WHERE tenant_id = @tenant_id AND name = 'Manager';

-- Global permission catalog (module × action matrix)
INSERT IGNORE INTO app_permissions (module, action, description)
SELECT m.module, a.action, CONCAT(a.action, ' ', m.module)
FROM (
  SELECT 'sales' AS module UNION ALL SELECT 'purchases' UNION ALL SELECT 'pos'
  UNION ALL SELECT 'items' UNION ALL SELECT 'parties' UNION ALL SELECT 'employees'
  UNION ALL SELECT 'accounts' UNION ALL SELECT 'banking' UNION ALL SELECT 'expenses'
  UNION ALL SELECT 'reports' UNION ALL SELECT 'settings' UNION ALL SELECT 'users'
) m
CROSS JOIN (
  SELECT 'view' AS action UNION ALL SELECT 'create' UNION ALL SELECT 'edit' UNION ALL SELECT 'delete'
) a;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT @owner_role, id FROM app_permissions;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT @mgr_role, id FROM app_permissions
WHERE module IN ('sales','purchases','pos','items','parties','reports')
  AND action IN ('view','create','edit');

-- ── Owner user (login: admin@gramathaankadai.com / 1234) ────────────
INSERT INTO app_users (tenant_id, name, email, phone, password_hash, role_id, is_active)
VALUES (@tenant_id, 'Admin', 'admin@gramathaankadai.com', '+91 98765 43210', @pwd, @owner_role, TRUE);
SET @admin_user_id := LAST_INSERT_ID();

UPDATE tenants SET owner_user_id = @admin_user_id WHERE id = @tenant_id;

-- ── HR: department, designations, employees, leave types ───────────
INSERT INTO departments (tenant_id, name) VALUES (@tenant_id, 'Store Operations');
SET @dept_id := LAST_INSERT_ID();

INSERT INTO designations (tenant_id, name) VALUES (@tenant_id, 'Cashier');
SET @desig_cashier := LAST_INSERT_ID();
INSERT INTO designations (tenant_id, name) VALUES (@tenant_id, 'Store Manager');
SET @desig_manager := LAST_INSERT_ID();

INSERT INTO employees (tenant_id, employee_code, name, phone, designation_id, department_id,
                       date_of_joining, salary_type, employee_type, basic_salary)
VALUES (@tenant_id, 'EMP001', 'Suresh Kumar', '+91 90000 11111', @desig_cashier, @dept_id,
        '2024-06-01', 'perMonth', 'salaried', 18000);

INSERT INTO employees (tenant_id, employee_code, name, phone, designation_id, department_id,
                       date_of_joining, salary_type, employee_type, basic_salary)
VALUES (@tenant_id, 'EMP002', 'Lakshmi Narayan', '+91 90000 22222', @desig_manager, @dept_id,
        '2023-02-15', 'perMonth', 'salaried', 35000);

INSERT INTO leave_types (tenant_id, name, code, annual_allotment, is_paid, color) VALUES
  (@tenant_id, 'Casual Leave', 'CL',  12, TRUE,  'blue'),
  (@tenant_id, 'Sick Leave',   'SL',  8,  TRUE,  'amber'),
  (@tenant_id, 'Loss of Pay',  'LOP', 0,  FALSE, 'red');

-- ── Reference data: UoM, categories, payment modes, tax slabs ──────
INSERT INTO uom_list (tenant_id, code, descr) VALUES
  (@tenant_id, 'PCS', 'Pieces'), (@tenant_id, 'KG', 'Kilogram'),
  (@tenant_id, 'LTR', 'Litre'),  (@tenant_id, 'GM', 'Gram'),
  (@tenant_id, 'BOX', 'Box');

INSERT INTO categories (tenant_id, name) VALUES (@tenant_id, 'Groceries');
SET @cat_grocery := LAST_INSERT_ID();
INSERT INTO categories (tenant_id, name) VALUES (@tenant_id, 'Beverages');
INSERT INTO categories (tenant_id, name) VALUES (@tenant_id, 'Dairy');
SET @cat_dairy := LAST_INSERT_ID();
INSERT INTO categories (tenant_id, name) VALUES (@tenant_id, 'Household');

INSERT INTO payment_modes (tenant_id, name, descr) VALUES
  (@tenant_id, 'Cash', 'Cash payment'),
  (@tenant_id, 'UPI',  'UPI / QR'),
  (@tenant_id, 'Card', 'Debit / Credit card');

INSERT INTO payment_type_settings (tenant_id, payment_mode_id, color, icon, display_order, is_default)
SELECT @tenant_id, id, 'green', 'Banknote', 0, TRUE
FROM payment_modes WHERE tenant_id = @tenant_id AND name = 'Cash';
INSERT INTO payment_type_settings (tenant_id, payment_mode_id, color, icon, display_order)
SELECT @tenant_id, id, 'blue', 'Smartphone', 1
FROM payment_modes WHERE tenant_id = @tenant_id AND name = 'UPI';

INSERT INTO tax_slabs (tenant_id, name, rate, cgst, sgst, igst) VALUES (@tenant_id, 'GST 0%', 0, 0, 0, 0);
SET @slab0 := LAST_INSERT_ID();
INSERT INTO tax_slabs (tenant_id, name, rate, cgst, sgst, igst) VALUES (@tenant_id, 'GST 5%', 5, 2.5, 2.5, 5);
SET @slab5 := LAST_INSERT_ID();
INSERT INTO tax_slabs (tenant_id, name, rate, cgst, sgst, igst) VALUES (@tenant_id, 'GST 12%', 12, 6, 6, 12);
INSERT INTO tax_slabs (tenant_id, name, rate, cgst, sgst, igst) VALUES (@tenant_id, 'GST 18%', 18, 9, 9, 18);
SET @slab18 := LAST_INSERT_ID();

-- ── Products (+ opening stock into stock_ledger) ───────────────────
INSERT INTO products (tenant_id, short_name, item_code, category_id, hsn_code, uom,
                      purchase_price, mrp, sales_price, gst_rate, tax_slab_id, stock, reorder_level)
VALUES (@tenant_id, 'Sona Masoori Rice 25kg', 'RICE25', @cat_grocery, '1006', 'BOX',
        1100, 1400, 1350, 5, @slab5, 40, 10);
SET @prod_rice := LAST_INSERT_ID();

INSERT INTO products (tenant_id, short_name, item_code, category_id, hsn_code, uom,
                      purchase_price, mrp, sales_price, gst_rate, tax_slab_id, stock, reorder_level)
VALUES (@tenant_id, 'Sugar 1kg', 'SUGAR1', @cat_grocery, '1701', 'PCS',
        40, 50, 46, 5, @slab5, 200, 30);
SET @prod_sugar := LAST_INSERT_ID();

INSERT INTO products (tenant_id, short_name, item_code, category_id, hsn_code, uom,
                      purchase_price, mrp, sales_price, gst_rate, tax_slab_id, stock, reorder_level)
VALUES (@tenant_id, 'Toned Milk 500ml', 'MILK500', @cat_dairy, '0401', 'PCS',
        24, 30, 28, 0, @slab0, 120, 40);
SET @prod_milk := LAST_INSERT_ID();

INSERT INTO products (tenant_id, short_name, item_code, category_id, hsn_code, uom,
                      purchase_price, mrp, sales_price, gst_rate, tax_slab_id, stock, reorder_level)
VALUES (@tenant_id, 'Sunflower Oil 1L', 'OIL1L', @cat_grocery, '1512', 'LTR',
        120, 160, 150, 5, @slab5, 80, 20);
SET @prod_oil := LAST_INSERT_ID();

INSERT INTO products (tenant_id, short_name, item_code, category_id, hsn_code, uom,
                      purchase_price, mrp, sales_price, gst_rate, tax_slab_id, stock, reorder_level)
VALUES (@tenant_id, 'Bath Soap 100g', 'SOAP100', @cat_grocery, '3401', 'PCS',
        22, 35, 32, 18, @slab18, 150, 25);
SET @prod_soap := LAST_INSERT_ID();

INSERT INTO stock_ledger (tenant_id, product_id, location_id, txn_type, ref_table, qty_in, rate, balance_qty) VALUES
  (@tenant_id, @prod_rice,  @loc_id, 'opening', 'seed', 40,  1100, 40),
  (@tenant_id, @prod_sugar, @loc_id, 'opening', 'seed', 200, 40,   200),
  (@tenant_id, @prod_milk,  @loc_id, 'opening', 'seed', 120, 24,   120),
  (@tenant_id, @prod_oil,   @loc_id, 'opening', 'seed', 80,  120,  80),
  (@tenant_id, @prod_soap,  @loc_id, 'opening', 'seed', 150, 22,   150);

-- ── Parties (customers + supplier) + bank account ──────────────────
INSERT INTO parties (tenant_id, party_code, name, type, party_type, phone, billing_state, balance)
VALUES (@tenant_id, 'CUST001', 'Ravi General Store', 'customer', 'B2B', '+91 91111 00001', 'Tamil Nadu', 0);
SET @cust1 := LAST_INSERT_ID();

INSERT INTO parties (tenant_id, party_code, name, type, party_type, phone, billing_state, balance)
VALUES (@tenant_id, 'CUST002', 'Walk-in Customer', 'customer', 'B2C', NULL, 'Tamil Nadu', 0);

INSERT INTO parties (tenant_id, party_code, name, type, party_type, phone, gstin, billing_state, payable)
VALUES (@tenant_id, 'SUPP001', 'TN Wholesale Distributors', 'supplier', 'B2B',
        '+91 92222 00002', '33ZZXYZ9876Q1Z2', 'Tamil Nadu', 0);
SET @supplier := LAST_INSERT_ID();

INSERT INTO bank_accounts (tenant_id, bank_name, account_no, ifsc, type, balance)
VALUES (@tenant_id, 'State Bank of India', '00112233445', 'SBIN0000123', 'Current', 50000);
SET @bank_id := LAST_INSERT_ID();

-- ── Sample SALE (INV-0001) with 2 lines + ledger postings ──────────
INSERT INTO sales (tenant_id, invoice, party_id, location_id, cashier_user_id, customer_name,
                   state_of_supply, subtotal, discount, gst, grand_total, payment_mode,
                   payment_status, total_received, created_by_user_id)
VALUES (@tenant_id, 'INV-0001', @cust1, @loc_id, @admin_user_id, 'Ravi General Store',
        'Tamil Nadu', 1396.00, 0, 69.80, 1465.80, 'UPI', 'Paid', 1465.80, @admin_user_id);
SET @sale_id := LAST_INSERT_ID();

INSERT INTO sale_items (tenant_id, sale_id, product_id, name, qty, unit, rate, mrp, gst_rate, gst_amount, amount) VALUES
  (@tenant_id, @sale_id, @prod_sugar, 'Sugar 1kg',       20, 'PCS', 46,  50,  5, 46.00, 966.00),
  (@tenant_id, @sale_id, @prod_oil,   'Sunflower Oil 1L', 3, 'LTR', 150, 160, 5, 22.50, 472.50);

INSERT INTO stock_ledger (tenant_id, product_id, location_id, txn_type, ref_table, ref_id, qty_out, rate, balance_qty) VALUES
  (@tenant_id, @prod_sugar, @loc_id, 'sale', 'sales', @sale_id, 20, 46,  180),
  (@tenant_id, @prod_oil,   @loc_id, 'sale', 'sales', @sale_id, 3,  150, 77);
UPDATE products SET stock = stock - 20 WHERE id = @prod_sugar;
UPDATE products SET stock = stock - 3  WHERE id = @prod_oil;

INSERT INTO party_ledger (tenant_id, party_id, date, txn_type, ref_table, ref_id, debit, credit, balance)
VALUES (@tenant_id, @cust1, CURRENT_DATE, 'sale', 'sales', @sale_id, 1465.80, 1465.80, 0);

-- ── Sample PURCHASE (PUR-0001) with 1 line + stock in ──────────────
INSERT INTO purchases (tenant_id, invoice, party_id, location_id, party_name, subtotal, gst,
                       grand_total, total_paid, payment_status, payment_mode,
                       supplier_invoice_no, created_by_user_id)
VALUES (@tenant_id, 'PUR-0001', @supplier, @loc_id, 'TN Wholesale Distributors',
        22000.00, 1100.00, 23100.00, 23100.00, 'Paid', 'Bank Transfer', 'TNW/2026/0455', @admin_user_id);
SET @purchase_id := LAST_INSERT_ID();

INSERT INTO purchase_items (tenant_id, purchase_id, product_id, name, qty, price, total, unit, gst_rate, gst_amount)
VALUES (@tenant_id, @purchase_id, @prod_rice, 'Sona Masoori Rice 25kg', 20, 1100, 22000, 'BOX', 5, 1100);

INSERT INTO stock_ledger (tenant_id, product_id, location_id, txn_type, ref_table, ref_id, qty_in, rate, balance_qty)
VALUES (@tenant_id, @prod_rice, @loc_id, 'purchase', 'purchases', @purchase_id, 20, 1100, 60);
UPDATE products SET stock = stock + 20 WHERE id = @prod_rice;

-- ── A payment-in + an expense ──────────────────────────────────────
INSERT INTO payment_in_history (tenant_id, party_id, bank_account_id, party_name, amount,
                                payment_mode, reference, date, status)
VALUES (@tenant_id, @cust1, @bank_id, 'Ravi General Store', 1465.80, 'UPI', 'UPI-REF-99812',
        CURRENT_DATE, 'Applied');

INSERT INTO expense_categories (tenant_id, name, type, color)
VALUES (@tenant_id, 'Shop Rent', 'Indirect', 'bg-slate-100 text-slate-600');
SET @exp_cat_id := LAST_INSERT_ID();

INSERT INTO expenses (tenant_id, date, expense_category_id, description, amount, paid_amount, payment_mode)
VALUES (@tenant_id, CURRENT_DATE, @exp_cat_id, 'Monthly shop rent', 15000, 15000, 'Bank Transfer');

SELECT CONCAT('Seeded tenant gramathaankadai (id=', @tenant_id,
              ') — login admin@gramathaankadai.com / 1234') AS result;
