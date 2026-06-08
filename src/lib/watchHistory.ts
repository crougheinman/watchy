import type { Movie } from '../types';

/**
 * Continue-Watching store. Persists playback progress to localStorage and
 * exposes a tiny pub/sub so React components stay in sync (same tab via
 * listeners, across tabs via the `storage` event).
 */

const KEY = 'watchy:continue';
const MAX_ITEMS = 20;
const DONE_THRESHOLD = 95; // % progress at which a title is considered finished

export interface WatchItem {
  movie: Movie;
  progress: number;     // 0–100
  currentTime: number;  // seconds
  updatedAt: number;    // epoch ms
}

type Listener = () => void;
const listeners = new Set<Listener>();

const keyOf = (m: Movie) => `${m.mediaType}-${m.tmdbId}`;

function read(): WatchItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WatchItem[]) : [];
  } catch {
    return [];
  }
}

// Cached, stable snapshot for useSyncExternalStore (must be referentially
// stable between writes, otherwise it loops).
let cache: WatchItem[] = sortByRecent(read());

function sortByRecent(items: WatchItem[]): WatchItem[] {
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
}

function commit(items: WatchItem[]): void {
  cache = sortByRecent(items);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode — keep in-memory cache anyway */
  }
  listeners.forEach((l) => l());
}

export function getWatchList(): WatchItem[] {
  return cache;
}

export function upsertProgress(movie: Movie, progress: number, currentTime: number): void {
  if (progress <= 0) return;

  const rest = read().filter((i) => keyOf(i.movie) !== keyOf(movie));

  // Finished titles drop off the row instead of lingering at ~100%.
  if (progress >= DONE_THRESHOLD) {
    commit(rest);
    return;
  }

  const { resumeTime: _omit, ...clean } = movie; // don't persist transient resume hint
  void _omit;
  rest.push({ movie: clean, progress, currentTime, updatedAt: Date.now() });
  commit(sortByRecent(rest).slice(0, MAX_ITEMS));
}

export function removeProgress(movie: Movie): void {
  commit(read().filter((i) => keyOf(i.movie) !== keyOf(movie)));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Cross-tab sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = sortByRecent(read());
      listeners.forEach((l) => l());
    }
  });
}
