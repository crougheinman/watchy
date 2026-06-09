import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { APP_VERSION, UPDATE_DOWNLOAD_URL } from '../constants';
import { isOutdated } from '../lib/version';

interface VersionState {
  /** True until the app_config lookup resolves. */
  checking: boolean;
  /** True when this build is older than the version required in Supabase. */
  outdated: boolean;
  latest: string | null;
  downloadUrl: string;
  /** Global maintenance switch (blocks everyone until cleared). */
  maintenance: boolean;
  maintenanceReason: string | null;
}

interface AppConfigRow {
  latest_version: string | null;
  download_url: string | null;
  maintenance: boolean | null;
  maintenance_reason: string | null;
}

/**
 * Reads global app config from Supabase (`app_config`): the required version
 * (drives the update gate) and a maintenance switch (drives the maintenance
 * gate). Fails OPEN: if Supabase is unconfigured or the lookup fails, the user
 * is never locked out.
 */
export function useAppVersion(): VersionState {
  const [state, setState] = useState<VersionState>({
    checking: Boolean(supabase),
    outdated: false,
    latest: null,
    downloadUrl: UPDATE_DOWNLOAD_URL,
    maintenance: false,
    maintenanceReason: null,
  });

  useEffect(() => {
    if (!supabase) return; // not configured → skip the gates
    let active = true;

    supabase
      .from('app_config')
      .select('latest_version, download_url, maintenance, maintenance_reason')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        const row = data as AppConfigRow | null;
        if (error || !row) {
          setState((s) => ({ ...s, checking: false })); // fail open
          return;
        }
        setState({
          checking: false,
          outdated: row.latest_version ? isOutdated(APP_VERSION, row.latest_version) : false,
          latest: row.latest_version,
          downloadUrl: row.download_url || UPDATE_DOWNLOAD_URL,
          maintenance: Boolean(row.maintenance),
          maintenanceReason: row.maintenance_reason ?? null,
        });
      });

    return () => { active = false; };
  }, []);

  return state;
}
