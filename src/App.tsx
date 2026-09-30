import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import ClaimsPage from './pages/ClaimsPage';
import CategoriesPage from './pages/CategoriesPage';
import TeamPage from './pages/TeamPage';
import ImageBillPage from './pages/ImageBillPage';
import { AppLayout } from './components/layout/AppLayout';
import { AdminRoute, ManagerOrAdminRoute, ProtectedRoute } from './routes';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="expenses"   element={<ExpensesPage />} />
          <Route path="claims"     element={<ClaimsPage />} />
          <Route path="image-bill" element={<ImageBillPage />} />
          <Route path="categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
          <Route path="team"       element={<ManagerOrAdminRoute><TeamPage /></ManagerOrAdminRoute>} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
