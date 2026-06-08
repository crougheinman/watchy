import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { APP_VERSION, UPDATE_DOWNLOAD_URL } from '../constants';
import { isOutdated } from '../lib/version';

interface VersionState {
  /** True until the latest-version lookup resolves. */
  checking: boolean;
  /** True when this build is older than the version required in Supabase. */
  outdated: boolean;
  latest: string | null;
  downloadUrl: string;
}

interface AppConfigRow {
  latest_version: string | null;
  download_url: string | null;
}

/**
 * Checks the app's build version against the latest version stored in Supabase
 * (`app_config` table). If this build is older, the app must show the update
 * gate. Fails OPEN: if Supabase is unconfigured or the lookup fails, the user
 * is never locked out.
 */
export function useAppVersion(): VersionState {
  const [state, setState] = useState<VersionState>({
    checking: Boolean(supabase),
    outdated: false,
    latest: null,
    downloadUrl: UPDATE_DOWNLOAD_URL,
  });

  useEffect(() => {
    if (!supabase) return; // not configured → skip the gate
    let active = true;

    supabase
      .from('app_config')
      .select('latest_version, download_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        const row = data as AppConfigRow | null;
        if (error || !row?.latest_version) {
          // Fail open — don't block the app on a config/network issue.
          setState((s) => ({ ...s, checking: false }));
          return;
        }
        setState({
          checking: false,
          outdated: isOutdated(APP_VERSION, row.latest_version),
          latest: row.latest_version,
          downloadUrl: row.download_url || UPDATE_DOWNLOAD_URL,
        });
      });

    return () => { active = false; };
  }, []);

  return state;
}
