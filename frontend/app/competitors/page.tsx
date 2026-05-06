'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function CompetitorsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || user?.role !== 'ADMIN') return null;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Конкурентный анализ</h1>
        <p className="text-sm text-gray-500 mt-1">Презентация по конкурентным данным</p>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 0,
          paddingTop: '56.25%',
          paddingBottom: 0,
          boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
          borderRadius: '8px',
          overflow: 'hidden',
          willChange: 'transform',
        }}
      >
        <iframe
          loading="lazy"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            border: 'none',
            padding: 0,
            margin: 0,
          }}
          src="https://www.canva.com/design/DAHG_W3PLgs/-B50F4ScL7N-pUOEyUh_3g/view?embed"
          allowFullScreen
          allow="fullscreen"
        />
      </div>

      <div className="mt-3 text-xs text-gray-400 text-right">
        <a
          href="https://www.canva.com/design/DAHG_W3PLgs/-B50F4ScL7N-pUOEyUh_3g/view"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-500 transition-colors"
        >
          Открыть в Canva ↗
        </a>
      </div>
    </div>
  );
}
