import { useSyncExternalStore } from 'react';
import { getMyList, subscribe } from '../lib/myList';
import type { Movie } from '../types';

export function useMyList(): Movie[] {
  return useSyncExternalStore(subscribe, getMyList, getMyList);
}
