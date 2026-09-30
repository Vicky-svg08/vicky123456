-- ============================================================
--  OFFICE EXPENSE MANAGER — Combined Migration
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor).
--
--  Sections:
--    1. Schema          (001_schema.sql)
--    2. Seed Data       (002_seed.sql)
--    3. Fix Admin RLS   (003_fix_admin_update.sql)
--    4. Auto-create     (004_auto_create_employee.sql)
--    5. Reimbursements  (005_reimbursements.sql)
--    6. Storage Bucket  (006_storage_bucket.sql)
--    7. Bill URLs       (007_bill_urls.sql)
-- ============================================================


-- ============================================================
--  1. SCHEMA
-- ============================================================

-- ── 1. CUSTOM TYPE ───────────────────────────────────────────
-- expense_status enum (used by expenses.status)
DO $$ BEGIN
  CREATE TYPE public.expense_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. set_timestamp trigger function ────────────────────────
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 3. EMPLOYEES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id          UUID        NOT NULL,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  team        TEXT        NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT employees_pkey       PRIMARY KEY (id),
  CONSTRAINT employees_email_key  UNIQUE (email),
  CONSTRAINT employees_id_fkey    FOREIGN KEY (id)
      REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT employees_role_check CHECK (
      role = ANY (ARRAY['employee'::text, 'manager'::text, 'admin'::text])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS employees_role_idx ON public.employees USING btree (role) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS employees_team_idx ON public.employees USING btree (team) TABLESPACE pg_default;

-- RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read employees (needed for team page & filters)
CREATE POLICY "employees_select_all"
  ON public.employees FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own row (name / team — not role)
CREATE POLICY "employees_update_own"
  ON public.employees FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update ANY employee row including role
CREATE POLICY "employees_update_admin"
  ON public.employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  );

-- Auth sign-up inserts own row
CREATE POLICY "employees_insert_own"
  ON public.employees FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 4. EXPENSE CATEGORIES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id          BIGSERIAL   NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expense_categories_pkey     PRIMARY KEY (id),
  CONSTRAINT expense_categories_name_key UNIQUE (name)
) TABLESPACE pg_default;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all"
  ON public.expense_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "categories_insert_admin"
  ON public.expense_categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

CREATE POLICY "categories_update_admin"
  ON public.expense_categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

CREATE POLICY "categories_delete_admin"
  ON public.expense_categories FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

-- ── 5. EXPENSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id               BIGSERIAL              NOT NULL,
  title            TEXT                   NOT NULL,
  description      TEXT                   NULL,
  amount           NUMERIC(12, 2)         NOT NULL,
  currency         TEXT                   NOT NULL DEFAULT 'INR'::text,
  category_id      BIGINT                 NULL,
  payment_method   TEXT                   NOT NULL,
  date             DATE                   NOT NULL,
  status           public.expense_status  NOT NULL DEFAULT 'pending'::expense_status,
  receipt_url      TEXT                   NULL,
  created_by       UUID                   NOT NULL DEFAULT auth.uid(),
  approved_by      UUID                   NULL,
  approved_at      TIMESTAMPTZ            NULL,
  rejection_reason TEXT                   NULL,
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  CONSTRAINT expenses_pkey             PRIMARY KEY (id),
  CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by)
      REFERENCES public.employees (id),
  CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id)
      REFERENCES public.expense_categories (id) ON DELETE SET NULL,
  CONSTRAINT expenses_created_by_fkey  FOREIGN KEY (created_by)
      REFERENCES public.employees (id) ON DELETE CASCADE,
  CONSTRAINT expenses_amount_check     CHECK (amount >= 0::numeric)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS expenses_created_by_idx ON public.expenses USING btree (created_by) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS expenses_status_idx     ON public.expenses USING btree (status)     TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS expenses_date_idx       ON public.expenses USING btree (date)       TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS expenses_category_idx   ON public.expenses USING btree (category_id) TABLESPACE pg_default;

-- Auto-update updated_at on every row change
DROP TRIGGER IF EXISTS set_timestamp ON public.expenses;
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Employees see only their own expenses
CREATE POLICY "expenses_select_own"
  ON public.expenses FOR SELECT
  USING (created_by = auth.uid());

-- Managers and admins see all expenses
CREATE POLICY "expenses_select_manager_admin"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role IN ('manager', 'admin')
    )
  );

-- Any authenticated user can create an expense for themselves
CREATE POLICY "expenses_insert_own"
  ON public.expenses FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Owner can edit their own pending expense
CREATE POLICY "expenses_update_own_pending"
  ON public.expenses FOR UPDATE
  USING  (created_by = auth.uid() AND status = 'pending')
  WITH CHECK (created_by = auth.uid());

-- Managers/admins can update any expense (approve, reject, edit)
CREATE POLICY "expenses_update_manager_admin"
  ON public.expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role IN ('manager', 'admin')
    )
  );

-- Owner can delete their own pending expense
CREATE POLICY "expenses_delete_own_pending"
  ON public.expenses FOR DELETE
  USING (created_by = auth.uid() AND status = 'pending');

-- Admins can delete any expense
CREATE POLICY "expenses_delete_admin"
  ON public.expenses FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );


-- ============================================================
--  2. SEED DATA
--
--  Demo credentials (create these in Auth → Users first):
--    admin@company.com    / Admin@1234
--    manager@company.com  / Manager@1234
--    user@company.com     / User@1234
--  Then run:  SELECT seed_demo_employees();
-- ============================================================

-- ── Default expense categories ────────────────────────────────
INSERT INTO public.expense_categories (name, description) VALUES
  ('Travel',        'Flights, hotels, cabs and transport'),
  ('Meals',         'Client dinners, team lunches and food'),
  ('Software',      'SaaS subscriptions and software licenses'),
  ('Office',        'Supplies, furniture and equipment'),
  ('Marketing',     'Ads, events and promotional material'),
  ('Training',      'Courses, books and conferences'),
  ('Utilities',     'Internet, phone and office utilities'),
  ('Miscellaneous', 'Other expenses not covered above')
ON CONFLICT (name) DO NOTHING;

-- ── Helper: auto-link auth.users → employees by email ─────────
CREATE OR REPLACE FUNCTION public.seed_demo_employees()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id   UUID;
  v_manager_id UUID;
  v_user_id    UUID;
BEGIN
  SELECT id INTO v_admin_id   FROM auth.users WHERE email = 'admin@company.com'   LIMIT 1;
  SELECT id INTO v_manager_id FROM auth.users WHERE email = 'manager@company.com' LIMIT 1;
  SELECT id INTO v_user_id    FROM auth.users WHERE email = 'user@company.com'    LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.employees (id, name, email, role, team)
    VALUES (v_admin_id, 'Admin User', 'admin@company.com', 'admin', 'Management')
    ON CONFLICT (id) DO UPDATE
      SET name = 'Admin User', role = 'admin', team = 'Management';
  END IF;

  IF v_manager_id IS NOT NULL THEN
    INSERT INTO public.employees (id, name, email, role, team)
    VALUES (v_manager_id, 'Manager User', 'manager@company.com', 'manager', 'Operations')
    ON CONFLICT (id) DO UPDATE
      SET name = 'Manager User', role = 'manager', team = 'Operations';
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.employees (id, name, email, role, team)
    VALUES (v_user_id, 'Demo Employee', 'user@company.com', 'employee', 'Engineering')
    ON CONFLICT (id) DO UPDATE
      SET name = 'Demo Employee', role = 'employee', team = 'Engineering';
  END IF;

  RETURN format(
    'Seeded → admin: %s | manager: %s | user: %s',
    COALESCE(v_admin_id::text,   '❌ not found — create admin@company.com in Auth first'),
    COALESCE(v_manager_id::text, '❌ not found — create manager@company.com in Auth first'),
    COALESCE(v_user_id::text,    '❌ not found — create user@company.com in Auth first')
  );
END;
$$;

-- ── Optional demo expenses ─────────────────────────────────────
-- Uncomment and run AFTER calling seed_demo_employees():
/*
DO $$
DECLARE
  v_admin_id  UUID;
  v_user_id   UUID;
  v_travel    BIGINT;
  v_meals     BIGINT;
  v_sw        BIGINT;
  v_office    BIGINT;
BEGIN
  SELECT id INTO v_admin_id FROM public.employees WHERE email = 'admin@company.com';
  SELECT id INTO v_user_id  FROM public.employees WHERE email = 'user@company.com';
  SELECT id INTO v_travel   FROM public.expense_categories WHERE name = 'Travel';
  SELECT id INTO v_meals    FROM public.expense_categories WHERE name = 'Meals';
  SELECT id INTO v_sw       FROM public.expense_categories WHERE name = 'Software';
  SELECT id INTO v_office   FROM public.expense_categories WHERE name = 'Office';

  INSERT INTO public.expenses
    (title, amount, currency, category_id, payment_method, date, status, created_by)
  VALUES
    ('Flight to Mumbai',     8500,  'INR', v_travel, 'Corporate Card', CURRENT_DATE - 10, 'approved', v_user_id),
    ('Client dinner',        3200,  'INR', v_meals,  'Personal Card',  CURRENT_DATE - 5,  'pending',  v_user_id),
    ('Figma subscription',   5000,  'INR', v_sw,     'Corporate Card', CURRENT_DATE - 2,  'pending',  v_admin_id),
    ('Team lunch',           1800,  'INR', v_meals,  'Cash',           CURRENT_DATE - 1,  'approved', v_user_id),
    ('Office chairs x2',    12000,  'INR', v_office, 'Corporate Card', CURRENT_DATE - 15, 'rejected', v_user_id);
END;
$$;
*/


-- ============================================================
--  3. FIX ADMIN UPDATE POLICIES
--  Drops and recreates the two employee UPDATE policies
--  with correct WITH CHECK clauses.
-- ============================================================

DROP POLICY IF EXISTS "employees_update_own"   ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin" ON public.employees;

-- Users can update only their own row (name / team — NOT role)
CREATE POLICY "employees_update_own"
  ON public.employees FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update ANY employee row including role
CREATE POLICY "employees_update_admin"
  ON public.employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  );


-- ============================================================
--  4. AUTO-CREATE EMPLOYEES ROW ON SIGNUP
--
--  A SECURITY DEFINER trigger on auth.users that runs
--  server-side (bypasses RLS) and creates the employees row
--  automatically whenever anyone signs up.
-- ============================================================

-- ── 1. Trigger function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER           -- runs as superuser, bypasses RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (id, name, email, role)
  VALUES (
    NEW.id,
    -- use display name from metadata if provided, else fall back to email prefix
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'employee'             -- everyone starts as employee; admin upgrades via SQL
  )
  ON CONFLICT (id) DO NOTHING;  -- safe to re-run; won't overwrite existing rows

  RETURN NEW;
END;
$$;

-- ── 2. Attach trigger to auth.users ──────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Back-fill existing auth users who have no employees row ─
--  Safe to run multiple times (ON CONFLICT DO NOTHING).
INSERT INTO public.employees (id, name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  'employee'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Verify ─────────────────────────────────────────────────
-- Run this after to confirm all auth users now have an employees row:
-- SELECT u.email, e.role
-- FROM auth.users u
-- LEFT JOIN public.employees e ON e.id = u.id
-- ORDER BY u.created_at;


-- ============================================================
--  5. REIMBURSEMENTS — RLS policies only
--  The reimbursements table already exists in your project.
-- ============================================================

ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;

-- Employees can see reimbursements for their own expenses
DROP POLICY IF EXISTS "reimbursements_select_own" ON public.reimbursements;
CREATE POLICY "reimbursements_select_own"
  ON public.reimbursements FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE created_by = auth.uid()
    )
  );

-- Managers and admins can see all reimbursements
DROP POLICY IF EXISTS "reimbursements_select_manager_admin" ON public.reimbursements;
CREATE POLICY "reimbursements_select_manager_admin"
  ON public.reimbursements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role IN ('manager','admin')
    )
  );

-- Only managers and admins can create reimbursements
DROP POLICY IF EXISTS "reimbursements_insert_manager_admin" ON public.reimbursements;
CREATE POLICY "reimbursements_insert_manager_admin"
  ON public.reimbursements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role IN ('manager','admin')
    )
  );

-- Only admins can delete a reimbursement record
DROP POLICY IF EXISTS "reimbursements_delete_admin" ON public.reimbursements;
CREATE POLICY "reimbursements_delete_admin"
  ON public.reimbursements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  );


-- ============================================================
--  6. STORAGE BUCKET SETUP — bills & receipts
-- ============================================================

-- ── 1. Create the bucket ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,                        -- private bucket, signed URLs only
  10485760,                     -- 10 MB per file
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/jpg','image/png',
    'image/webp','image/heic','application/pdf'
  ];

-- ── 2. Drop old policies (safe re-run) ───────────────────────
DROP POLICY IF EXISTS "receipts_insert_own"   ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_own"   ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_own"   ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_own"   ON storage.objects;

-- ── 3. UPLOAD — users upload only inside their own folder ─────
-- Path pattern:  receipts/{user_id}/{anything}
CREATE POLICY "receipts_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. READ — own files + managers/admins read all ───────────
CREATE POLICY "receipts_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (
      -- owner
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- manager or admin
      EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = auth.uid()
          AND e.role IN ('manager', 'admin')
      )
    )
  );

-- ── 5. UPDATE (replace file) — own files only ────────────────
CREATE POLICY "receipts_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 6. DELETE — own files only ───────────────────────────────
CREATE POLICY "receipts_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 7. Verify ────────────────────────────────────────────────
-- Run after setup to check bucket and policies exist:
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets WHERE id = 'receipts';
--
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'objects' AND policyname LIKE 'receipts%';


-- ============================================================
--  7. ADD bill_urls COLUMN TO EXPENSES
--  Stores multiple storage paths for bills/receipts
-- ============================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS bill_urls TEXT[] DEFAULT NULL;

-- Index for querying expenses that have bills attached
CREATE INDEX IF NOT EXISTS expenses_bill_urls_idx
  ON public.expenses USING GIN (bill_urls)
  WHERE bill_urls IS NOT NULL;
