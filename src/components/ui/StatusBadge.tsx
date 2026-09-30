import type { ExpenseStatus } from '../../types/db';

const config: Record<ExpenseStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-800',  dot: 'bg-amber-400',  label: 'Pending'  },
  approved: { bg: 'bg-green-50',  text: 'text-green-800',  dot: 'bg-green-500',  label: 'Approved' },
  rejected: { bg: 'bg-red-50',    text: 'text-red-800',    dot: 'bg-red-400',    label: 'Rejected' },
};

export const StatusBadge = ({ status }: { status: ExpenseStatus }) => {
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};
