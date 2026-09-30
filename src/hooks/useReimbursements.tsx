import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/db';

type Reimbursement = Database['public']['Tables']['reimbursements']['Row'];

export const useReimbursements = () => {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reimbursements')
        .select('*')
        .order('reimbursed_at', { ascending: false });

      if (error) throw error;
      setReimbursements(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createReimbursement = async (payload: {
    expense_id: number;
    amount: number;
  }) => {
    // 1. Fetch expense details needed for the email
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('title, amount, currency, employee_id')
      .eq('id', payload.expense_id)
      .single();

    if (expenseError) throw expenseError;

    // 2. Insert the reimbursement record
    const { error } = await supabase
      .from('reimbursements')
      .insert({
        expense_id: payload.expense_id,
        amount: payload.amount,
        reimbursed_at: new Date().toISOString(),
      });

    if (error) throw error;

    // 3. Send email via the unified send-email function
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'reimbursed',
        expense_id: payload.expense_id,
        employee_id: expense.employee_id,
        expense_title: expense.title,
        expense_amount: expense.amount,
        expense_currency: expense.currency ?? 'INR',
        reimbursement_amount: payload.amount,
      },
    });

    if (emailError) {
      console.error('[send-email] reimbursed failed:', emailError);
    }

    await load();
  };

  return { reimbursements, loading, error, createReimbursement, load };
};