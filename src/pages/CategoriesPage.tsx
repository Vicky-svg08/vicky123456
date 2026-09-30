import { FormEvent, useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { ExpenseCategory } from '../types/db';

const CATEGORY_COLORS = ['#7F77DD','#1D9E75','#D85A30','#378ADD','#D4537E','#BA7517'];
const CATEGORY_ICONS = ['✈️','🍽️','💻','🏢','📢','📦','🎯','🔧','📋','💰'];

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">{children}</label>
);

const CategoriesPage = () => {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseCategory | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      await updateCategory(editingId, { name, description });
    } else {
      await createCategory({ name, description });
    }
    setName(''); setDescription(''); setEditingId(null);
  };

  const startEdit = (c: ExpenseCategory) => {
    setEditingId(c.id); setName(c.name); setDescription(c.description ?? '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="mt-1 text-sm text-gray-500">Organize your expenses by type.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Form card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          {editingId ? 'Edit category' : 'Add new category'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Travel" required />
            </div>
            <div className="flex-[2]">
              <FieldLabel>Description</FieldLabel>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? 'Update' : 'Add category'}</Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setName(''); setDescription(''); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Category grid */}
      {loading ? <Spinner /> : (
        <>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
              <div className="mb-3 text-4xl">🗂️</div>
              <p className="text-sm font-medium text-gray-400">No categories yet</p>
              <p className="mt-1 text-xs text-gray-300">Add your first category above</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((c, i) => {
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                const icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length];
                return (
                  <div key={c.id} className="group rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                        style={{ background: color + '18' }}
                      >
                        {icon}
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => startEdit(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {c.description && <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{c.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete category"
          message={`Delete "${confirmDelete.name}"? Expenses using this category will become uncategorized.`}
          confirmLabel="Delete"
          onConfirm={() => deleteCategory(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default CategoriesPage;
