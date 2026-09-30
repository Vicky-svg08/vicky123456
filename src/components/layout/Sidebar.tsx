import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabaseClient';

const COMPANY_NAME_KEY = 'app_company_name';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '📊', roles: ['employee','manager','admin'] },
  { to: '/expenses',   label: 'My Expenses', icon: '💸', roles: ['employee','manager','admin'] },
  { to: '/claims',     label: 'Claims',      icon: '📋', roles: ['employee','manager','admin'] },
  { to: '/image-bill', label: 'Image Bill',  icon: '🧾', roles: ['employee','manager','admin'] },
  { to: '/categories', label: 'Categories',  icon: '🗂️', roles: ['admin'] },
  { to: '/team',       label: 'Team',        icon: '👥', roles: ['manager','admin'] },
];

// ── Persist company name in localStorage (simple, no extra DB table needed)
const getStoredName = () => localStorage.getItem(COMPANY_NAME_KEY) || 'Vicky';
const setStoredName = (name: string) => localStorage.setItem(COMPANY_NAME_KEY, name);

export const Sidebar = () => {
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed]     = useState(false);
  const [companyName, setCompanyName] = useState(getStoredName);
  const [editing, setEditing]         = useState(false);
  const [draft, setDraft]             = useState(companyName);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const role = profile?.role ?? 'employee';
  const isAdmin = role === 'admin';

  const visible = navItems.filter(n => n.roles.includes(role));

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editing]);

  const saveCompanyName = () => {
    const trimmed = draft.trim() || 'Vicky';
    setCompanyName(trimmed);
    setStoredName(trimmed);
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveCompanyName();
    if (e.key === 'Escape') { setDraft(companyName); setEditing(false); }
  };

  return (
    <aside
      className="flex h-full flex-col border-r border-gray-100 bg-white transition-all duration-300"
      style={{ width: collapsed ? 64 : 224 }}
    >
      {/* Logo + Company Name */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 min-h-[57px]">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 text-base">💼</div>
        {!collapsed && (
          <div className="flex-1 min-w-0 flex items-center gap-1">
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={saveCompanyName}
                onKeyDown={onKeyDown}
                className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                maxLength={32}
              />
            ) : (
              <>
                <span className="truncate text-sm font-bold text-gray-900">{companyName}</span>
                {isAdmin && (
                  <button
                    onClick={() => { setDraft(companyName); setEditing(true); }}
                    title="Edit company name"
                    className="ml-1 flex-shrink-0 rounded p-0.5 text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    ✏️
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {visible.map(({ to, label, icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center' : ''} ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-1">
        <button onClick={() => setCollapsed(c => !c)}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span className="text-base">{collapsed ? '→' : '←'}</span>
          {!collapsed && 'Collapse'}
        </button>

        {!collapsed && profile && (
          <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
            <Avatar name={profile.name} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-800">{profile.name}</p>
              <p className="truncate text-[10px] text-gray-400 capitalize">{profile.role}</p>
            </div>
          </div>
        )}

        <button onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          title="Log out">
          <span className="text-base">🚪</span>
          {!collapsed && 'Log out'}
        </button>
      </div>
    </aside>
  );
};
