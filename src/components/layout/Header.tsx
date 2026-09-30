import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';

const pageTitles: Record<string, { icon: string; label: string }> = {
  '/dashboard':  { icon: '📊', label: 'Dashboard' },
  '/expenses':   { icon: '💸', label: 'My Expenses' },
  '/claims':     { icon: '📋', label: 'Claims' },
  '/image-bill': { icon: '🧾', label: 'Image Bill' },
  '/categories': { icon: '🗂️', label: 'Categories' },
  '/team':       { icon: '👥', label: 'Team' },
};

export const Header = () => {
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const page = pageTitles[pathname] ?? { icon: '📋', label: 'Office Expense' };

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{page.icon}</span>
        <h1 className="text-sm font-semibold text-gray-900">{page.label}</h1>
      </div>
      <div className="flex items-center gap-3">
        {profile && (
          <>
            <div className="flex items-center gap-2">
              <Avatar name={profile.name} size={30} />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-700">{profile.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{profile.role}</p>
              </div>
            </div>
            <button onClick={() => signOut()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700">
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
};
