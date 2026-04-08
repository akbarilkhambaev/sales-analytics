'use client';

import Sidebar from './Sidebar';
import { useAuth } from '@/lib/AuthContext';
import { usePathname } from 'next/navigation';

// Pages where sidebar should NOT appear
const PUBLIC_PATHS = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Show sidebar only for authenticated users on non-public pages
  const showSidebar = !isLoading && isAuthenticated && !isPublicPath;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
