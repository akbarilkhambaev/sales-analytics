'use client';

import { useEffect, useState, useRef } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWARegister() {
  const [showBanner, setShowBanner] = useState(false);
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('SW registration failed:', err));
    }

    // Skip if already running as installed app
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Skip if dismissed this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    // Capture install prompt if browser supports it (requires HTTPS)
    // Note: do NOT call e.preventDefault() — that would hide the browser's own install button
    const handler = (e: Event) => {
      deferredPrompt.current = e as typeof deferredPrompt.current;
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Always show banner after 3 seconds (even without install prompt)
    const timer = setTimeout(() => {
      setShowBanner(true);
      // Trigger transition on next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      // Native install prompt (Chrome/Edge on HTTPS)
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        deferredPrompt.current = null;
        handleDismiss();
      }
    } else {
      // Detect device/browser for specific instructions
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/.test(ua);
      const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
      let msg = '';
      if (isIOS || isSafari) {
        msg = 'Чтобы установить на iPhone/iPad:\n\n1. Нажмите кнопку «Поделиться» (□↑) внизу браузера\n2. Выберите «На экран «Домой»»\n3. Нажмите «Добавить»';
      } else {
        msg = 'Чтобы установить на телефон:\n\nAndroid Chrome:\n1. Нажмите ⋮ (три точки) в правом верхнем углу\n2. Выберите «Добавить на главный экран»\n3. Нажмите «Добавить»';
      }
      alert(msg);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setShowBanner(false), 300);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0' : '100px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Установить приложение</p>
          <p className="text-xs text-gray-400 mt-0.5">Быстрее открывается, как обычное приложение</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Скачать
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
