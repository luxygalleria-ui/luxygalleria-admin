'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminToken, clearAdminSession } from '../../lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // A token that is merely *present* is not enough - an expired one still
    // mounts the dashboard and every page then 401s on mount.
    if (!getAdminToken()) {
      clearAdminSession();
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Show a loading spinner while checking authentication to prevent UI flashing
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
