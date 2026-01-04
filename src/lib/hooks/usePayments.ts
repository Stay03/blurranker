'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getSessionPayments,
  getPlayerPayments,
  markPaymentAsPaid,
  markPaymentAsUnpaid,
  markAllPaymentsBetweenPlayersPaid,
  type PaymentWithDetails,
} from '@/lib/payment';

/**
 * Hook to fetch and subscribe to payments for a session
 */
export function useSessionPayments(sessionId: string | undefined) {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchPaymentsSilent = useCallback(async () => {
    if (!sessionId) return;

    const data = await getSessionPayments(supabase, sessionId);
    setPayments(data);
    setError(null);
  }, [supabase, sessionId]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchPayments = useCallback(async () => {
    if (!sessionId) {
      setPayments([]);
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getSessionPayments(supabase, sessionId);
    setPayments(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase, sessionId]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchPayments();

    if (!sessionId) return;

    // Subscribe to real-time changes for payments in this session
    const channel = supabase
      .channel(`payments-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchPaymentsSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, fetchPayments, fetchPaymentsSilent]);

  const markPaid = useCallback(
    async (paymentId: string) => {
      const success = await markPaymentAsPaid(supabase, paymentId);
      if (success) {
        await fetchPaymentsSilent();
      }
      return success;
    },
    [supabase, fetchPaymentsSilent]
  );

  const markUnpaid = useCallback(
    async (paymentId: string) => {
      const success = await markPaymentAsUnpaid(supabase, paymentId);
      if (success) {
        await fetchPaymentsSilent();
      }
      return success;
    },
    [supabase, fetchPaymentsSilent]
  );

  const markAllPaidBetweenPlayers = useCallback(
    async (fromPlayerId: string, toPlayerId: string) => {
      if (!sessionId) return false;
      const success = await markAllPaymentsBetweenPlayersPaid(
        supabase,
        sessionId,
        fromPlayerId,
        toPlayerId
      );
      if (success) {
        await fetchPaymentsSilent();
      }
      return success;
    },
    [supabase, sessionId, fetchPaymentsSilent]
  );

  // Derived data
  const unpaidPayments = useMemo(
    () => payments.filter((p) => !p.is_paid),
    [payments]
  );

  const paidPayments = useMemo(
    () => payments.filter((p) => p.is_paid),
    [payments]
  );

  const totalUnpaid = useMemo(
    () => unpaidPayments.reduce((sum, p) => sum + p.amount, 0),
    [unpaidPayments]
  );

  const totalPaid = useMemo(
    () => paidPayments.reduce((sum, p) => sum + p.amount, 0),
    [paidPayments]
  );

  return {
    payments,
    unpaidPayments,
    paidPayments,
    totalUnpaid,
    totalPaid,
    isLoading,
    error,
    refresh: fetchPayments,
    markPaid,
    markUnpaid,
    markAllPaidBetweenPlayers,
  };
}

/**
 * Hook to fetch and subscribe to payments for a specific player
 */
export function usePlayerPayments(playerId: string | undefined) {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchPaymentsSilent = useCallback(async () => {
    if (!playerId) return;

    const data = await getPlayerPayments(supabase, playerId);
    setPayments(data);
    setError(null);
  }, [supabase, playerId]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchPayments = useCallback(async () => {
    if (!playerId) {
      setPayments([]);
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getPlayerPayments(supabase, playerId);
    setPayments(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase, playerId]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchPayments();

    if (!playerId) return;

    // Subscribe to real-time changes for payments involving this player
    const channel = supabase
      .channel(`player-payments-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          // Only refresh if this payment involves our player
          const payment = payload.new as { from_player_id?: string; to_player_id?: string };
          if (
            payment?.from_player_id === playerId ||
            payment?.to_player_id === playerId
          ) {
            fetchPaymentsSilent();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, playerId, fetchPayments, fetchPaymentsSilent]);

  const markPaid = useCallback(
    async (paymentId: string) => {
      const success = await markPaymentAsPaid(supabase, paymentId);
      if (success) {
        await fetchPaymentsSilent();
      }
      return success;
    },
    [supabase, fetchPaymentsSilent]
  );

  const markUnpaid = useCallback(
    async (paymentId: string) => {
      const success = await markPaymentAsUnpaid(supabase, paymentId);
      if (success) {
        await fetchPaymentsSilent();
      }
      return success;
    },
    [supabase, fetchPaymentsSilent]
  );

  // Calculate balances
  const balance = useMemo(() => {
    if (!playerId) return { owed: 0, owes: 0, net: 0 };

    let owed = 0; // Money others owe this player
    let owes = 0; // Money this player owes others

    for (const payment of payments) {
      if (payment.is_paid) continue;

      if (payment.to_player_id === playerId) {
        owed += payment.amount;
      }
      if (payment.from_player_id === playerId) {
        owes += payment.amount;
      }
    }

    return { owed, owes, net: owed - owes };
  }, [payments, playerId]);

  return {
    payments,
    balance,
    isLoading,
    error,
    refresh: fetchPayments,
    markPaid,
    markUnpaid,
  };
}
