import { useSyncExternalStore } from 'react';
import { getWatchList, subscribe } from '../lib/watchHistory';
import type { WatchItem } from '../lib/watchHistory';

export function useContinueWatching(): WatchItem[] {
  return useSyncExternalStore(subscribe, getWatchList, getWatchList);
}
