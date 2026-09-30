export type Role = 'employee' | 'manager' | 'admin';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  category_id: number | null;
  payment_method: string;
  date: string;
  status: ExpenseStatus;
  receipt_url: string | null;
  bill_urls: string | null;         // stored as comma-separated text in DB
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  reimbursed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reimbursement {
  id: number;
  expense_id: number;
  reimbursed_by: string | null;
  amount: number;
  reimbursed_at: string;
  created_at: string;
}