import { useState } from 'react';
import type { Expense, Employee, ExpenseCategory } from '../../types/db';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BillViewer } from './BillViewer';

interface Props {
  expenses: Expense[];
  employees: Employee[];
  categories: ExpenseCategory[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onApprove: (expense: Expense) => void;
  onReject: (expense: Expense) => void;
}

export const ExpenseTable = ({
  expenses, employees, categories, onEdit, onDelete, onApprove, onReject,
}: Props) => {
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const [confirmReject, setConfirmReject] = useState<Expense | null>(null);

  const getEmployee = (id: string | null) => employees.find(e => e.id === id)?.name ?? '—';
  const getCategory = (id: number | null) => categories.find(c => c.id === id)?.name ?? '—';

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
        <div className="mb-3 text-4xl">💸</div>
        <p className="text-sm font-medium text-gray-400">No expenses found</p>
        <p className="mt-1 text-xs text-gray-300">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Title & Bills','Employee','Category','Amount','Date','Status','Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(exp => (
                <tr key={exp.id} className="group transition-colors hover:bg-gray-50/60">
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{exp.title}</p>
                    {exp.description && (
                      <p className="truncate text-xs text-gray-400">{exp.description}</p>
                    )}
                    {exp.rejection_reason && (
                      <p className="truncate text-xs text-red-500">↳ {exp.rejection_reason}</p>
                    )}
                    {/* Bill links with signed URLs */}
                    <BillViewer receiptUrl={exp.receipt_url} billUrls={exp.bill_urls} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {getEmployee(exp.created_by)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {getCategory(exp.category_id)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900"
                    style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {exp.amount.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-normal text-gray-400">{exp.currency}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{exp.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={exp.status} />
                      {exp.reimbursed && (
                        <span className="text-[10px] font-semibold text-green-600">💸 Reimbursed</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(exp)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => setConfirmDelete(exp)}>Delete</Button>
                      {exp.status === 'pending' && (
                        <>
                          <Button size="sm"
                            className="bg-green-50 text-green-700 border-transparent hover:bg-green-100"
                            onClick={() => onApprove(exp)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setConfirmReject(exp)}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete expense"
          message={`Delete "${confirmDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => onDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
      {confirmReject && (
        <ConfirmDialog
          title="Reject expense"
          message={`Reject "${confirmReject.title}"?`}
          confirmLabel="Reject"
          onConfirm={() => onReject(confirmReject)}
          onClose={() => setConfirmReject(null)}
        />
      )}
    </>
  );
};
