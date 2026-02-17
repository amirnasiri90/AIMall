'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 relative overflow-x-hidden">
      <div className="mesh-gradient" />
      <div className="w-full max-w-md relative z-10 min-w-0 px-1">{children}</div>
    </div>
  );
}
