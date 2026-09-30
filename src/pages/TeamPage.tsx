import { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import type { Role } from '../types/db';

const ROLE_STYLES: Record<Role, { bg: string; text: string }> = {
  admin:    { bg: '#EEEDFE', text: '#534AB7' },
  manager:  { bg: '#E1F5EE', text: '#0F6E56' },
  employee: { bg: '#F1EFE8', text: '#5F5E5A' },
};

const TeamPage = () => {
  const { profile: currentUser } = useAuth();
  const { employees, loading, error, updateEmployee } = useEmployees();

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName,  setEditName]    = useState('');
  const [editTeam,  setEditTeam]    = useState('');
  const [editRole,  setEditRole]    = useState<Role>('employee');
  const [saving,    setSaving]      = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const startEdit = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    setSaveError(null);
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditTeam(emp.team ?? '');
    setEditRole(emp.role);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const save = async () => {
    if (!editingId) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Non-admins cannot change roles — strip role from payload
      const payload = isAdmin
        ? { name: editName, team: editTeam, role: editRole }
        : { name: editName, team: editTeam };
      await updateEmployee(editingId, payload);
      setEditingId(null);
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save. Check your permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="mt-1 text-sm text-gray-500">
          {employees.length} member{employees.length !== 1 ? 's' : ''}
          {isAdmin && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              🔑 Admin — you can change roles
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? <Spinner /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16">
              <div className="mb-3 text-4xl">👥</div>
              <p className="text-sm font-medium text-gray-400">No employees found.</p>
            </div>
          ) : employees.map(emp => {
            const isEditing   = editingId === emp.id;
            const isSelf      = currentUser?.id === emp.id;
            const canEdit     = isAdmin || isSelf;     // admins edit anyone; others only self
            const canEditRole = isAdmin && !isSelf;    // only admins can change role, and not their own
            const roleStyle   = ROLE_STYLES[emp.role] ?? ROLE_STYLES.employee;

            return (
              <div
                key={emp.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md"
              >
                {/* Card header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={emp.name} size={44} />
                    {isSelf && (
                      <span
                        title="This is you"
                        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] text-white"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="mb-1 py-1 text-sm"
                        placeholder="Full name"
                      />
                    ) : (
                      <p className="truncate font-semibold text-gray-900">
                        {emp.name}
                        {isSelf && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                      </p>
                    )}
                    <p className="truncate text-xs text-gray-400">{emp.email}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 border-t border-gray-100 pt-3">
                  {/* Team */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-shrink-0 text-xs text-gray-400">Team</span>
                    {isEditing ? (
                      <Input
                        value={editTeam}
                        onChange={e => setEditTeam(e.target.value)}
                        className="w-36 py-1 text-xs"
                        placeholder="Team name"
                      />
                    ) : (
                      <span className="text-right text-xs font-medium text-gray-700">
                        {emp.team ?? '—'}
                      </span>
                    )}
                  </div>

                  {/* Role */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-shrink-0 text-xs text-gray-400">Role</span>
                    {isEditing && canEditRole ? (
                      <Select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as Role)}
                        className="w-36 py-1 text-xs"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                          style={{ background: roleStyle.bg, color: roleStyle.text }}
                        >
                          {isEditing ? editRole : emp.role}
                        </span>
                        {isEditing && !canEditRole && (
                          <span className="text-[10px] text-gray-400">
                            {isSelf ? "(can't change own role)" : '(admin only)'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save error */}
                {isEditing && saveError && (
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {saveError}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={save} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </>
                  ) : canEdit ? (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(emp.id)}>
                      Edit
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin legend */}
      {isAdmin && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
          <p className="font-semibold">Admin permissions on this page</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-indigo-600">
            <li>You can edit any team member's name and team</li>
            <li>You can change any team member's role (except your own)</li>
            <li>Role changes take effect immediately and update Supabase RLS permissions</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
