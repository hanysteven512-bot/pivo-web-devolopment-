import { useEffect, useState } from 'react';
import { VisitorSite } from './components/VisitorSite.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdminRoute) {
    return <AdminDashboard />;
  }

  return <VisitorSite />;
}
