import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Employee } from '../types/db';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setEmployees(data as Employee[]);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateEmployee = async (
    id: string,
    payload: Partial<Pick<Employee, 'name' | 'team' | 'role'>>
  ) => {
    const { error } = await supabase.from('employees').update(payload).eq('id', id);
    if (error) throw error;
    await load();
  };

  return { employees, loading, error, reload: load, updateEmployee };
};