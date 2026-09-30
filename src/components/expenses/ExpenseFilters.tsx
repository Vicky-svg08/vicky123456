import { ChangeEvent } from 'react';
import type { ExpenseStatus, ExpenseCategory, Employee } from '../../types/db';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import type { ExpenseFilters as ExpenseFiltersType } from '../../hooks/useExpenses';

interface Props {
  filters: ExpenseFilters;
  onChange: (f: ExpenseFilters) => void;
  categories: ExpenseCategory[];
  employees: Employee[];
  showEmployeeFilter: boolean;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
    {children}
  </label>
);

export const ExpenseFilters = ({ filters, onChange, categories, employees, showEmployeeFilter }: Props) => {
  const set = (field: keyof ExpenseFilters, value: any) => onChange({ ...filters, [field]: value });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <FieldLabel>Status</FieldLabel>
          <Select value={filters.status ?? 'all'} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('status', e.target.value as ExpenseStatus | 'all')}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={filters.categoryId ?? 'all'} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('categoryId', e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        {showEmployeeFilter && (
          <div>
            <FieldLabel>Employee</FieldLabel>
            <Select value={filters.employeeId ?? 'all'} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('employeeId', e.target.value)}>
              <option value="all">All employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </div>
        )}

        <div>
          <FieldLabel>Date range</FieldLabel>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={filters.fromDate ?? ''} onChange={e => set('fromDate', e.target.value || null)} className="text-xs" />
            <span className="text-gray-300">–</span>
            <Input type="date" value={filters.toDate ?? ''} onChange={e => set('toDate', e.target.value || null)} className="text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};