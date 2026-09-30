import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ExpenseCategory } from '../types/db';

export const useCategories = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setCategories(data as ExpenseCategory[]);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createCategory = async (payload: {
    name: string;
    description?: string;
  }) => {
    const { error } = await supabase.from('expense_categories').insert(payload);
    if (error) throw error;
    await load();
  };

  const updateCategory = async (id: number, payload: Partial<ExpenseCategory>) => {
    const { error } = await supabase
      .from('expense_categories')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    await load();
  };

  const deleteCategory = async (id: number) => {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await load();
  };

  return { categories, loading, error, reload: load, createCategory, updateCategory, deleteCategory };
};