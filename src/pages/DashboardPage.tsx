import { useMemo } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui/Spinner';
import { StatusBadge } from '../components/ui/StatusBadge';

const CATEGORY_COLORS = ['#7F77DD','#1D9E75','#D85A30','#378ADD','#D4537E','#BA7517'];
const CATEGORY_ICONS: Record<string, string> = {
  Travel: '✈️', Meals: '🍽️', Food: '🍽️', Software: '💻', Office: '🏢', Marketing: '📢', default: '📦',
};

const StatCard = ({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) => (
  <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5">
    <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: accent }} />
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
    <p className="text-3xl font-bold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
  </div>
);

const DashboardPage = () => {
  const { profile } = useAuth();
  const { expenses, loading, error } = useExpenses({ status: 'all' }, 150);
  const { categories } = useCategories();

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const { totalThisMonth, totalPending, totalApproved, totalRejected, byCategory } = useMemo(() => {
    let totalThisMonth = 0, totalPending = 0, totalApproved = 0, totalRejected = 0;
    const byCategory = new Map<number | null, number>();
    expenses.forEach(e => {
      if (e.date.startsWith(currentMonth)) totalThisMonth += e.amount;
      if (e.status === 'pending') totalPending += e.amount;
      if (e.status === 'approved') totalApproved += e.amount;
      if (e.status === 'rejected') totalRejected += e.amount;
      const k = e.category_id ?? null;
      byCategory.set(k, (byCategory.get(k) ?? 0) + e.amount);
    });
    return { totalThisMonth, totalPending, totalApproved, totalRejected, byCategory };
  }, [expenses, currentMonth]);

  const getCategoryName = (id: number | null) => categories.find(c => c.id === id)?.name ?? 'Uncategorized';
  const getCategoryIcon = (name: string) => CATEGORY_ICONS[name] ?? CATEGORY_ICONS.default;

  const maxCat = Math.max(...Array.from(byCategory.values()), 1);

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's your expense overview for {monthName}.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? <Spinner /> : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="This month" value={`₹${fmt(totalThisMonth)}`} accent="#7F77DD" sub={monthName} />
            <StatCard label="Pending approval" value={`₹${fmt(totalPending)}`} accent="#EF9F27" sub={`${expenses.filter(e=>e.status==='pending').length} expenses`} />
            <StatCard label="Total approved" value={`₹${fmt(totalApproved)}`} accent="#639922" />
            <StatCard label="Total rejected" value={`₹${fmt(totalRejected)}`} accent="#E24B4A" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* By category */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Spending by category</h2>
              {byCategory.size === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No expenses yet.</p>
              ) : (
                <div className="space-y-3.5">
                  {Array.from(byCategory.entries()).map(([catId, amount], i) => {
                    const name = getCategoryName(catId);
                    return (
                      <div key={catId ?? 'none'}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{getCategoryIcon(name)}</span>
                            <span className="text-sm font-medium text-gray-700">{name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ₹{fmt(amount)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(amount / maxCat) * 100}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Recent activity</h2>
              {recentExpenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No expenses yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map(exp => {
                    const catName = getCategoryName(exp.category_id);
                    return (
                      <div key={exp.id} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base">
                          {getCategoryIcon(catName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{exp.title}</p>
                          <p className="text-xs text-gray-400">{exp.date} · {catName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-bold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ₹{fmt(exp.amount)}
                          </span>
                          <StatusBadge status={exp.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
