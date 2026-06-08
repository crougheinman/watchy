import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AccountStatus {
  /** True until the profile lookup resolves. */
  checking: boolean;
  /** True when an admin has disabled this account in Supabase. */
  disabled: boolean;
  reason: string | null;
}

interface Resolved {
  id: string;
  disabled: boolean;
  reason: string | null;
}

/**
 * Reads the signed-in user's row from the Supabase `profiles` table and reports
 * whether the account has been disabled by an admin. Fails OPEN: if Supabase is
 * unconfigured, the row is missing, or the lookup errors, the user is treated
 * as enabled (never locked out by an infrastructure problem).
 */
export function useAccountStatus(userId: string | undefined): AccountStatus {
  const [result, setResult] = useState<Resolved | null>(null);

  useEffect(() => {
    if (!supabase || !userId || result?.id === userId) return;
    let active = true;
    supabase
      .from('profiles')
      .select('disabled, disabled_reason')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setResult({
          id: userId,
          disabled: !error && data ? Boolean(data.disabled) : false,
          reason: (!error && data ? (data.disabled_reason as string | null) : null) ?? null,
        });
      });
    return () => { active = false; };
  }, [userId, result]);

  const resolved = result !== null && result.id === userId;
  return {
    checking: Boolean(supabase && userId) && !resolved,
    disabled: resolved ? result.disabled : false,
    reason: resolved ? result.reason : null,
  };
}
