'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PremiumStatus, CreatePaymentResponse } from '@/lib/types/payment';

const PREMIUM_STORAGE_KEY = 'sunnyseat_premium';
const SESSION_ID_KEY = 'sunnyseat_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export interface UsePremiumReturn {
  isPremium: boolean;
  isLoading: boolean;
  sessionId: string;
  expiresAt: string | undefined;
  initiatePurchase: () => Promise<CreatePaymentResponse | null>;
  refreshStatus: () => Promise<void>;
}

export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | undefined>();

  const checkStatus = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/payments/status?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data: PremiumStatus = await res.json();
      setIsPremium(data.isPremium);
      setExpiresAt(data.expiresAt);
      if (data.isPremium) {
        localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(PREMIUM_STORAGE_KEY);
      }
    } catch {
      // Fall back to localStorage cache
      const cached = localStorage.getItem(PREMIUM_STORAGE_KEY);
      if (cached) {
        const data: PremiumStatus = JSON.parse(cached);
        const isExpired = data.expiresAt ? new Date(data.expiresAt) < new Date() : false;
        setIsPremium(data.isPremium && !isExpired);
        setExpiresAt(data.expiresAt);
      }
    }
  }, []);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    // Quick check from localStorage first
    const cached = localStorage.getItem(PREMIUM_STORAGE_KEY);
    if (cached) {
      try {
        const data: PremiumStatus = JSON.parse(cached);
        const isExpired = data.expiresAt ? new Date(data.expiresAt) < new Date() : false;
        setIsPremium(data.isPremium && !isExpired);
        setExpiresAt(data.expiresAt);
      } catch {
        // Ignore parse errors
      }
    }

    // Then verify with server
    checkStatus(sid).finally(() => setIsLoading(false));
  }, [checkStatus]);

  const initiatePurchase = useCallback(async (): Promise<CreatePaymentResponse | null> => {
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        console.error('Payment creation failed:', res.status);
        return null;
      }

      const data = await res.json();

      // If already premium, refresh status
      if (data.alreadyPremium) {
        await checkStatus(sessionId);
        return null;
      }

      return data as CreatePaymentResponse;
    } catch (error) {
      console.error('Payment initiation error:', error);
      return null;
    }
  }, [sessionId, checkStatus]);

  const refreshStatus = useCallback(async () => {
    if (sessionId) {
      await checkStatus(sessionId);
    }
  }, [sessionId, checkStatus]);

  return { isPremium, isLoading, sessionId, expiresAt, initiatePurchase, refreshStatus };
}
