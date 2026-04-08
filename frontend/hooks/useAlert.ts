'use client';

import { useState, useCallback } from 'react';
import type { AlertType } from '@/components/Alert';

interface AlertState {
  type: AlertType;
  title?: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback((config: AlertState) => {
    setAlert(config);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const success = useCallback((message: string, title?: string) => {
    showAlert({ type: 'success', message, title, autoClose: true, duration: 3000 });
  }, [showAlert]);

  const error = useCallback((message: string, title?: string) => {
    showAlert({ type: 'error', message, title, autoClose: false });
  }, [showAlert]);

  const warning = useCallback((message: string, title?: string) => {
    showAlert({ type: 'warning', message, title, autoClose: false });
  }, [showAlert]);

  const info = useCallback((message: string, title?: string) => {
    showAlert({ type: 'info', message, title, autoClose: true, duration: 4000 });
  }, [showAlert]);

  return {
    alert,
    success,
    error,
    warning,
    info,
    showAlert,
    hideAlert,
  };
}
