import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AccountStatus {
  /** True until the profile lookup resolves. */
  checking: boolean;
  /** True when an admin has disabled this account in Supabase. */
  disabled: boolean;
  reason: string | null;
  /** True once, when the account transitions disabled → enabled while open. */
  justApproved: boolean;
  /** Dismiss the just-approved welcome. */
  clearJustApproved: () => void;
}

interface Resolved {
  id: string;
  disabled: boolean;
  reason: string | null;
}

const POLL_MS = 30_000;

/**
 * Reads the signed-in user's `profiles` row and reports disabled state. Polls
 * (and re-checks on focus) so an admin's approve/disable takes effect without a
 * refresh — and flags the disabled→enabled transition so we can welcome the
 * user. Fails OPEN.
 */
export function useAccountStatus(userId: string | undefined): AccountStatus {
  const [result, setResult] = useState<Resolved | null>(null);
  // The user id we detected an approval for (null = none). Keyed by user so a
  // stale flag can never show the welcome to a different signed-in user.
  const [approvedFor, setApprovedFor] = useState<string | null>(null);
  const prevDisabled = useRef<boolean | null>(null);

  const clearJustApproved = useCallback(() => setApprovedFor(null), []);

  useEffect(() => {
    prevDisabled.current = null;
    if (!supabase || !userId) return;
    let active = true;

    const load = () => {
      supabase!
        .from('profiles')
        .select('disabled, disabled_reason')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;
          const disabled = !error && data ? Boolean(data.disabled) : false;
          const reason = (!error && data ? (data.disabled_reason as string | null) : null) ?? null;
          if (prevDisabled.current === true && disabled === false) setApprovedFor(userId);
          prevDisabled.current = disabled;
          setResult({ id: userId, disabled, reason });
        });
    };

    load();
    const interval = setInterval(load, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const resolved = result !== null && result.id === userId;
  return {
    checking: Boolean(supabase && userId) && !resolved,
    disabled: resolved ? result.disabled : false,
    reason: resolved ? result.reason : null,
    justApproved: approvedFor != null && approvedFor === userId,
    clearJustApproved,
  };
}
