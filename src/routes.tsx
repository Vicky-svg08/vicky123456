import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import CategoriesPage from './pages/CategoriesPage';
import TeamPage from './pages/TeamPage';

export const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children ?? <Outlet />}</>;
};

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const ManagerOrAdminRoute = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const routes = [
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      {
        path: '/categories',
        element: (
          <AdminRoute>
            <CategoriesPage />
          </AdminRoute>
        ),
      },
      {
        path: '/team',
        element: (
          <ManagerOrAdminRoute>
            <TeamPage />
          </ManagerOrAdminRoute>
        ),
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
];