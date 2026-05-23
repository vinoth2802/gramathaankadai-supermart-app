import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="ml-64 h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
