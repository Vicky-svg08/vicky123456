import { useState } from 'react';
import { useExpenses, type ExpenseFilters } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth';
import { ExpenseTable } from '../components/expenses/ExpenseTable';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseFilters as Filters } from '../components/expenses/ExpenseFilters';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import type { Expense } from '../types/db';

const ExpensesPage = () => {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<ExpenseFilters>({ status: 'all' });
  const { categories } = useCategories();
  const { employees } = useEmployees();
  const { expenses, loading, error, hasMore, loadMore, createExpense, updateExpense, deleteExpense, approveExpense } = useExpenses(filters);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);

  const isManagerOrAdmin = profile && (profile.role === 'manager' || profile.role === 'admin');

  const handleCreate = async (payload: Partial<Expense>) => {
    await createExpense({ ...(payload as any), status: 'pending' });
    setShowForm(false);
  };

  const handleUpdate = async (payload: Partial<Expense>) => {
    if (!editing) return;
    await updateExpense(editing.id, payload);
    setEditing(null);
    setShowForm(false);
  };

  const handleReject = async (exp: Expense) => {
    if (!isManagerOrAdmin) return;
    const reason = window.prompt('Rejection reason (optional):') || undefined;
    await approveExpense(exp.id, false, reason);
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            {expenses.length} record{expenses.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="gap-2"
        >
          <span className="text-base leading-none">+</span> New expense
        </Button>
      </div>

      {/* Filters */}
      <Filters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        employees={employees}
        showEmployeeFilter={!!isManagerOrAdmin}
      />

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? <Spinner /> : (
        <>
          <ExpenseTable
            expenses={expenses}
            employees={employees}
            categories={categories}
            onEdit={exp => { setEditing(exp); setShowForm(true); }}
            onDelete={exp => deleteExpense(exp.id)}
            onApprove={exp => { if (isManagerOrAdmin) approveExpense(exp.id, true); }}
            onReject={handleReject}
          />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={loadMore}>Load more</Button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit expense' : 'New expense'} onClose={() => { setEditing(null); setShowForm(false); }}>
          <ExpenseForm
            initial={editing ?? undefined}
            categories={categories}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancel={() => { setEditing(null); setShowForm(false); }}
          />
        </Modal>
      )}
    </div>
  );
};

export default ExpensesPage;
