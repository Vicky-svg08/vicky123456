# Supabase Setup Guide

## The core problem this solves

Supabase Authentication stores users in `auth.users`.  
This app also needs a row in `public.employees` for each user (to store name, role, team).  

**Migration `004` adds a database trigger** (`handle_new_user`) that automatically creates  
the `employees` row whenever anyone signs up — no manual step needed, ever.

---

## Run order (fresh project)

### Step 1 — Schema
Paste and run `migrations/001_schema.sql` in **SQL Editor**.  
Creates all tables, RLS policies, indexes, storage bucket.

### Step 2 — Auto-employee trigger ← most important
Paste and run `migrations/004_auto_create_employee.sql` in **SQL Editor**.

This does three things:
1. Creates `handle_new_user()` trigger function (SECURITY DEFINER — bypasses RLS)
2. Attaches it to `auth.users` so it fires on every new signup automatically
3. **Back-fills existing users** — inserts an `employees` row for anyone already in Auth who doesn't have one yet

### Step 3 — Seed categories
Paste and run `migrations/002_seed.sql`.  
Inserts 8 default expense categories.

### Step 4 — Create demo users
Go to **Authentication → Users → Add user**:

| Email                  | Password       |
|------------------------|----------------|
| `admin@company.com`    | `Admin@1234`   |
| `manager@company.com`  | `Manager@1234` |
| `user@company.com`     | `User@1234`    |

After adding them, run in SQL Editor to set correct roles:
```sql
UPDATE public.employees SET role = 'admin'   WHERE email = 'admin@company.com';
UPDATE public.employees SET role = 'manager' WHERE email = 'manager@company.com';
```
(The trigger creates everyone as `employee` by default.)

### Step 5 — Verify
```sql
SELECT u.email, e.role, e.name
FROM auth.users u
LEFT JOIN public.employees e ON e.id = u.id
ORDER BY u.created_at;
```
Every auth user should have a matching employees row.

### Step 6 — Start the app
```bash
npm install
npm run dev
```

---

## Already have users stuck in Auth with no employees row?

Just run `004_auto_create_employee.sql` — the back-fill at the bottom handles it automatically.

Then set roles manually:
```sql
UPDATE public.employees SET role = 'admin' WHERE email = 'your@email.com';
```

---

## How to change a user's role

**Option A — SQL Editor (any time):**
```sql
UPDATE public.employees SET role = 'admin'   WHERE email = 'user@example.com';
UPDATE public.employees SET role = 'manager' WHERE email = 'user@example.com';
UPDATE public.employees SET role = 'employee' WHERE email = 'user@example.com';
```

**Option B — Table Editor:**  
Table Editor → `employees` table → click the row → edit `role` field → Save.

**Option C — Via the app:**  
Log in as admin → Team page → Edit any member → change Role dropdown → Save.

> After any role change the user must **log out and back in** for the app to pick up the new role.

---

## Role & permission matrix

| Action                        | Employee | Manager | Admin |
|-------------------------------|----------|---------|-------|
| View own expenses             | ✅       | ✅      | ✅    |
| View all expenses             | ❌       | ✅      | ✅    |
| Create expense                | ✅       | ✅      | ✅    |
| Edit own pending expense      | ✅       | ✅      | ✅    |
| Edit any expense              | ❌       | ✅      | ✅    |
| Approve / reject expenses     | ❌       | ✅      | ✅    |
| Delete own pending expense    | ✅       | ✅      | ✅    |
| Delete any expense            | ❌       | ❌      | ✅    |
| Manage categories             | ❌       | ❌      | ✅    |
| View Team page                | ❌       | ✅      | ✅    |
| Edit own name & team          | ✅       | ✅      | ✅    |
| Change any user's role        | ❌       | ❌      | ✅    |
| Upload receipts               | ✅       | ✅      | ✅    |
