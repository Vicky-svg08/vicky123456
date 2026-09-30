import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Expense, ExpenseStatus } from '../types/db';

export interface ExpenseFilters {
  status?: ExpenseStatus | 'all';
  categoryId?: number | 'all';
  employeeId?: string | 'all';
  fromDate?: string | null;
  toDate?: string | null;
}

/** Fire-and-forget: invoke the send-email edge function.
 *  Errors are logged to console but never thrown — email failure
 *  should never block the main workflow. */
async function sendEmailNotification(payload: {
  type: 'approved' | 'rejected' | 'reimbursed';
  expense_id: number;
  employee_id: string;
  expense_title: string;
  expense_amount: number;
  expense_currency: string;
  rejection_reason?: string;
  reimbursement_amount?: number;
}) {
  try {
    const { error } = await supabase.functions.invoke('send-email', { body: payload });
    if (error) console.error('[send-email]', error);
  } catch (err) {
    console.error('[send-email] unexpected error:', err);
  }
}

export const useExpenses = (filters: ExpenseFilters, pageSize = 20) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('expenses').select('*', { count: 'exact' }).order('date', {
      ascending: false,
    });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.employeeId && filters.employeeId !== 'all') {
      query = query.eq('created_by', filters.employeeId);
    }
    if (filters.fromDate) {
      query = query.gte('date', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.lte('date', filters.toDate);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      const newData = data as Expense[];
      setExpenses((prev) => (reset ? newData : [...prev, ...newData]));
      if (count !== null) {
        setHasMore(to + 1 < count);
      } else {
        setHasMore(newData.length === pageSize);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const loadMore = async () => {
    setPage((p) => p + 1);
    await load();
  };

  const createExpense = async (payload: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('expenses').insert(payload);
    if (error) throw error;
    await load(true);
  };

  const updateExpense = async (id: number, payload: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(payload).eq('id', id);
    if (error) throw error;
    await load(true);
  };

  const deleteExpense = async (id: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    await load(true);
  };

  const approveExpense = async (id: number, approved: boolean, reason?: string) => {
    const expense = expenses.find(e => e.id === id);
    if (approved && expense?.status === 'rejected') {
      throw new Error('Cannot approve a rejected expense.');
    }

    const payload: Partial<Expense> = {
      status: approved ? 'approved' : 'rejected',
      rejection_reason: approved ? null : reason ?? null,
      approved_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('expenses').update(payload).eq('id', id);
    if (error) throw error;

    // Send email notification to the employee (fire-and-forget)
    if (expense) {
      sendEmailNotification({
        type: approved ? 'approved' : 'rejected',
        expense_id: expense.id,
        employee_id: expense.created_by,
        expense_title: expense.title,
        expense_amount: expense.amount,
        expense_currency: expense.currency,
        rejection_reason: approved ? undefined : reason,
      });
    }

    await load(true);
  };

  return {
    expenses,
    loading,
    error,
    hasMore,
    loadMore,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    sendEmailNotification, // exported so useReimbursements can use it too
  };
};
