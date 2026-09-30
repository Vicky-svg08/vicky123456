import { useState, useMemo } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useReimbursements } from '../hooks/useReimbursements';
import { useCategories } from '../hooks/useCategories';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import type { Expense } from '../types/db';
import { BillViewer } from '../components/expenses/BillViewer';
import { ExpenseForm } from '../components/expenses/ExpenseForm';

// ── helpers ───────────────────────────────────────────────────
const fmt = (n: number, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'NEFT', 'RTGS'];

// ── Verify modal ──────────────────────────────────────────────
function VerifyModal({ expense, onApprove, onReject, onClose }: {
  expense: Expense;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode]     = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const submit = async () => {
    setSaving(true); setErr('');
    try {
      if (mode === 'approve') await onApprove();
      else {
        if (!reason.trim()) { setErr('Please provide a reason.'); setSaving(false); return; }
        await onReject(reason);
      }
      onClose();
    } catch (e: any) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <Modal title="Verify expense claim" onClose={onClose}>
      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="font-semibold text-gray-900">{expense.title}</p>
        <p className="mt-0.5 text-sm text-gray-500">{expense.description}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{fmt(expense.amount, expense.currency)}</p>
        <p className="text-xs text-gray-400">{expense.date} · {expense.payment_method}</p>
        <div className="mt-2"><BillViewer receiptUrl={expense.receipt_url} billUrls={expense.bill_urls} /></div>
      </div>

      {!mode ? (
        <div className="flex gap-3">
          {expense.status !== 'rejected' && (
            <button onClick={() => setMode('approve')}
              className="flex-1 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700 hover:bg-green-100">
              ✅ Approve
            </button>
          )}
          <button onClick={() => setMode('reject')}
            className="flex-1 rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100">
            ❌ Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 text-sm">
            <span>{mode === 'approve' ? '✅ Approving' : '❌ Rejecting'} this claim</span>
            <button onClick={() => setMode(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">change</button>
          </div>
          {mode === 'reject' && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Rejection reason *</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Explain why this claim is being rejected..." />
            </div>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}
              className={mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {saving ? 'Saving…' : mode === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Reimburse modal ───────────────────────────────────────────
function ReimburseModal({ expense, employeeName, onSubmit, onClose }: {
  expense: Expense;
  employeeName: string;
  onSubmit: (payload: { expense_id: number; amount: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(expense.amount.toString());
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const submit = async () => {
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount.'); return; }
    setSaving(true); setErr('');
    try {
      await onSubmit({ expense_id: expense.id, amount: Number(amount) });
      onClose();
    } catch (e: any) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <Modal title="Mark as reimbursed" onClose={onClose}>
      <div className="mb-5 rounded-xl bg-green-50 border border-green-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-1">Reimbursing</p>
        <p className="font-semibold text-gray-900">{expense.title}</p>
        <p className="text-sm text-gray-500">to <span className="font-medium text-gray-700">{employeeName}</span></p>
        <p className="mt-1 text-xl font-bold text-green-700">{fmt(expense.amount, expense.currency)}</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Amount to reimburse</label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          <p className="mt-1 text-xs text-gray-400">Adjust for partial reimbursement.</p>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? 'Processing…' : '💸 Confirm reimbursement'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Claim list row ────────────────────────────────────────────
function ClaimRow({ expense, employeeName, categoryName, isManagerOrAdmin, reimbursed, onVerify, onReimburse }: {
  expense: Expense;
  employeeName: string;
  categoryName: string;
  isManagerOrAdmin: boolean;
  reimbursed: boolean;
  onVerify: () => void;
  onReimburse: () => void;
}) {
  const rowBg = {
    pending:  'border-l-amber-400',
    approved: reimbursed ? 'border-l-green-400' : 'border-l-blue-400',
    rejected: 'border-l-red-400',
  }[expense.status];

  return (
    <div className={`flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm border-l-4 ${rowBg} hover:shadow-md transition-shadow`}>

      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 w-40 flex-shrink-0">
        <Avatar name={employeeName} size={32} />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-900">{employeeName}</p>
          <p className="truncate text-[10px] text-gray-400">{expense.date}</p>
        </div>
      </div>

      {/* Title + category */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-800">{expense.title}</p>
        <p className="truncate text-xs text-gray-400">{categoryName} · {expense.payment_method}</p>
        {expense.rejection_reason && (
          <p className="truncate text-[10px] text-red-500 mt-0.5">Rejected: {expense.rejection_reason}</p>
        )}
      </div>

      {/* Bill viewer */}
      <div className="flex-shrink-0">
        <BillViewer receiptUrl={expense.receipt_url} billUrls={expense.bill_urls} />
      </div>

      {/* Amount */}
      <div className="w-28 flex-shrink-0 text-right">
        <p className="text-sm font-bold text-gray-900">{fmt(expense.amount, expense.currency)}</p>
        {reimbursed && <p className="text-[10px] font-semibold text-green-600">💸 Reimbursed</p>}
      </div>

      {/* Status */}
      <div className="w-24 flex-shrink-0 flex justify-center">
        <StatusBadge status={expense.status} />
      </div>

      {/* Actions */}
      <div className="w-32 flex-shrink-0 flex justify-end gap-1.5">
        {isManagerOrAdmin && expense.status === 'pending' && (
          <Button size="sm" onClick={onVerify}>🔍 Verify</Button>
        )}
        {isManagerOrAdmin && expense.status === 'approved' && !reimbursed && (
          <Button size="sm" onClick={onReimburse} className="bg-green-600 hover:bg-green-700 text-white">
            💸 Pay
          </Button>
        )}
        {isManagerOrAdmin && expense.status === 'approved' && reimbursed && (
          <span className="text-[10px] font-medium text-green-600">✓ Done</span>
        )}
        {isManagerOrAdmin && expense.status === 'rejected' && (
          <span className="text-[10px] text-gray-400">No action</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
const ClaimsPage = () => {
  const { profile } = useAuth();
  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin';

  const { expenses, loading, error, approveExpense, updateExpense, createExpense } = useExpenses({ status: 'all' }, 100);
  const { categories } = useCategories();
  const { employees }  = useEmployees();
  const { reimbursements, createReimbursement } = useReimbursements();

  const reimbursedIds = useMemo(() => new Set(reimbursements.map(r => r.expense_id)), [reimbursements]);
  const isReimbursed  = (exp: Expense) => reimbursedIds.has(exp.id);

  const [tab, setTab]             = useState<'all' | 'pending' | 'approved' | 'rejected' | 'reimbursed'>('all');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [verifying, setVerifying]     = useState<Expense | null>(null);
  const [reimbursing, setReimbursing] = useState<Expense | null>(null);

  const getCat = (id: number | null) => categories.find(c => c.id === id)?.name ?? '—';
  const getEmp = (id: string) => employees.find(e => e.id === id)?.name ?? 'Unknown';

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (tab === 'reimbursed') return isReimbursed(e);
      if (tab !== 'all' && e.status !== tab) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) &&
          !getEmp(e.created_by).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, tab, search, employees, reimbursedIds]);

  const stats = useMemo(() => ({
    pending:      expenses.filter(e => e.status === 'pending').length,
    approved:     expenses.filter(e => e.status === 'approved' && !isReimbursed(e)).length,
    reimbursed:   expenses.filter(e => isReimbursed(e)).length,
    totalPending: expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
  }), [expenses, reimbursedIds]);

  const tabs = [
    { key: 'all',        label: 'All',        count: expenses.length },
    { key: 'pending',    label: 'Pending',     count: stats.pending },
    { key: 'approved',   label: 'Approved',    count: stats.approved },
    { key: 'rejected',   label: 'Rejected',    count: expenses.filter(e => e.status === 'rejected').length },
    { key: 'reimbursed', label: 'Reimbursed',  count: stats.reimbursed },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Claims</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isManagerOrAdmin
              ? 'Review, approve and reimburse employee expense claims'
              : 'Track the status of your submitted expense claims'}
          </p>
        </div>
        {!isManagerOrAdmin && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <span className="text-base leading-none">+</span> New expense
          </Button>
        )}
      </div>

      {/* Summary cards */}
      {isManagerOrAdmin && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Awaiting review</p>
            <p className="mt-1 text-3xl font-bold text-amber-900">{stats.pending}</p>
            <p className="text-sm text-amber-700">{fmt(stats.totalPending)} pending</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Approved, unpaid</p>
            <p className="mt-1 text-3xl font-bold text-blue-900">{stats.approved}</p>
            <p className="text-sm text-blue-700">Ready to reimburse</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Reimbursed</p>
            <p className="mt-1 text-3xl font-bold text-green-900">{stats.reimbursed}</p>
            <p className="text-sm text-green-700">Payments completed</p>
          </div>
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-600'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or employee…" className="max-w-xs" />
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* List */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="mb-3 text-4xl">📋</div>
          <p className="text-sm font-medium text-gray-400">No claims found</p>
          <p className="mt-1 text-xs text-gray-300">Try a different tab or clear your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* List header */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            <div className="w-40 flex-shrink-0">Employee</div>
            <div className="flex-1">Title / Category</div>
            <div className="flex-shrink-0 w-6"></div>
            <div className="w-28 flex-shrink-0 text-right">Amount</div>
            <div className="w-24 flex-shrink-0 text-center">Status</div>
            <div className="w-32 flex-shrink-0 text-right">Action</div>
          </div>
          {filtered.map(exp => (
            <ClaimRow
              key={exp.id}
              expense={exp}
              employeeName={getEmp(exp.created_by)}
              categoryName={getCat(exp.category_id)}
              isManagerOrAdmin={isManagerOrAdmin}
              reimbursed={isReimbursed(exp)}
              onVerify={() => setVerifying(exp)}
              onReimburse={() => setReimbursing(exp)}
            />
          ))}
        </div>
      )}

      {/* Verify modal */}
      {verifying && (
        <VerifyModal
          expense={verifying}
          onApprove={async () => { await approveExpense(verifying.id, true); setVerifying(null); }}
          onReject={async (reason) => { await approveExpense(verifying.id, false, reason); setVerifying(null); }}
          onClose={() => setVerifying(null)}
        />
      )}

      {/* Reimburse modal */}
      {reimbursing && (
        <ReimburseModal
          expense={reimbursing}
          employeeName={getEmp(reimbursing.created_by)}
          onSubmit={createReimbursement}
          onClose={() => setReimbursing(null)}
        />
      )}

      {/* New expense modal */}
      {showForm && (
        <Modal title="New expense" onClose={() => setShowForm(false)}>
          <ExpenseForm
            categories={categories}
            onSubmit={async (payload) => {
              await createExpense({ ...(payload as any), status: 'pending' });
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ClaimsPage;
