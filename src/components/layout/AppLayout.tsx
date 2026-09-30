import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => (
  <div className="flex h-screen overflow-hidden bg-bg">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto px-6 py-7">
        <Outlet />
      </main>
    </div>
  </div>
);
