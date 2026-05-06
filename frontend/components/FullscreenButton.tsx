'use client';

import { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function FullscreenButton({ className = '', size = 'md' }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported or permission denied
    }
  }, []);

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const label = isFullscreen ? 'Свернуть' : 'Полный экран';

  return (
    <button
      onClick={toggle}
      title={label}
      className={`px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2 ${className}`}
    >
      {isFullscreen ? (
        <Minimize2 className={iconSize} />
      ) : (
        <Maximize2 className={iconSize} />
      )}
      <span className="hidden sm:inline text-sm">{label}</span>
    </button>
  );
}
