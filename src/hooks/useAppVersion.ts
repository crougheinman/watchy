import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { APP_VERSION, UPDATE_DOWNLOAD_URL } from '../constants';
import { isOutdated } from '../lib/version';

// The update gate only applies to the installed app (APKs can be stale). The
// browser always serves the latest build, so it's never "outdated".
const IS_NATIVE = Capacitor.isNativePlatform();

// How often to re-check app_config so maintenance/version toggles take effect
// without a manual refresh. Also re-checks instantly whenever the app/tab
// regains focus.
const POLL_MS = 60_000;

interface VersionState {
  /** True until the first app_config lookup resolves. */
  checking: boolean;
  /** True when this build is older than the version required in Supabase. */
  outdated: boolean;
  latest: string | null;
  downloadUrl: string;
  /** Global maintenance switch (blocks everyone until cleared). */
  maintenance: boolean;
  maintenanceReason: string | null;
  /** Optional app-wide announcement banner text (null = none). */
  announcement: string | null;
}

interface AppConfigRow {
  latest_version: string | null;
  download_url: string | null;
  maintenance: boolean | null;
  maintenance_reason: string | null;
  announcement: string | null;
}

/**
 * Reads global app config from Supabase (`app_config`): the required version
 * (update gate, native only) and a maintenance switch. Re-checks on an interval
 * and on focus so changes propagate to open clients within ~1 min. Fails OPEN:
 * config/network errors during a poll keep the last known state (and never lock
 * users out on the first load).
 */
export function useAppVersion(): VersionState {
  const [state, setState] = useState<VersionState>({
    checking: Boolean(supabase),
    outdated: false,
    latest: null,
    downloadUrl: UPDATE_DOWNLOAD_URL,
    maintenance: false,
    maintenanceReason: null,
    announcement: null,
  });

  useEffect(() => {
    if (!supabase) return; // not configured → skip the gates
    let active = true;

    const load = () => {
      supabase!
        .from('app_config')
        .select('latest_version, download_url, maintenance, maintenance_reason, announcement')
        .eq('id', 1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;
          const row = data as AppConfigRow | null;
          if (error || !row) {
            // Keep last known gate state; just clear the initial spinner.
            setState((s) => ({ ...s, checking: false }));
            return;
          }
          setState({
            checking: false,
            outdated: IS_NATIVE && row.latest_version ? isOutdated(APP_VERSION, row.latest_version) : false,
            latest: row.latest_version,
            downloadUrl: row.download_url || UPDATE_DOWNLOAD_URL,
            maintenance: Boolean(row.maintenance),
            maintenanceReason: row.maintenance_reason ?? null,
            announcement: row.announcement ?? null,
          });
        });
    };

    load(); // initial
    const interval = setInterval(load, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return state;
}
