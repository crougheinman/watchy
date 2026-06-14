import type { Movie } from '../types';
import { supabase } from './supabase';

/**
 * Continue-Watching store. Cloud-synced per user via Supabase `watch_progress`,
 * with a localStorage cache for instant load + offline resilience. Exposes a
 * tiny pub/sub so React stays in sync (useSyncExternalStore).
 *
 * Call initWatchHistory(userId) once the signed-in user is known (App does this)
 * to load their cloud progress; clearWatchHistory() on sign-out.
 */

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
let userId: string | null = null;
let cache: WatchItem[] = [];
let mutations = 0; // bumped on every local upsert/remove (guards the init race)

const keyOf = (m: Movie) => `${m.mediaType}-${m.tmdbId}`;
const storageKey = () => `watchy:continue:${userId ?? 'anon'}`;

function sortByRecent(items: WatchItem[]): WatchItem[] {
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
}

function readLocal(): WatchItem[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WatchItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: WatchItem[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  } catch {
    /* quota / private mode — keep in-memory cache anyway */
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

function setCache(items: WatchItem[]): void {
  cache = sortByRecent(items).slice(0, MAX_ITEMS);
  writeLocal(cache);
  emit();
}

export function getWatchList(): WatchItem[] {
  return cache;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Load this user's progress: local cache instantly, then merge in the cloud. */
export async function initWatchHistory(uid: string | null): Promise<void> {
  userId = uid;
  cache = sortByRecent(readLocal()).slice(0, MAX_ITEMS); // instant
  emit();
  if (!supabase || !uid) return;
  const startMutations = mutations;
  try {
    const { data, error } = await supabase
      .from('watch_progress')
      .select('movie, progress, current_seconds, updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })
      .limit(MAX_ITEMS);
    // Skip if the user changed or made a local edit (finish/remove/progress)
    // while the fetch was in flight — otherwise the stale snapshot resurrects it.
    if (error || !data || userId !== uid || mutations !== startMutations) return;
    setCache(data.map((r) => ({
      movie: r.movie as Movie,
      progress: Number(r.progress) || 0,
      currentTime: Number(r.current_seconds) || 0,
      updatedAt: r.updated_at ? new Date(r.updated_at as string).getTime() : Date.now(),
    })));
  } catch {
    /* offline — keep the local cache */
  }
}

export function clearWatchHistory(): void {
  userId = null;
  cache = [];
  emit();
}

export function upsertProgress(movie: Movie, progress: number, currentTime: number): void {
  if (progress <= 0) return;

  const { resumeTime: _omit, ...clean } = movie; // don't persist transient resume hint
  void _omit;

  // Finished titles drop off the row instead of lingering at ~100%.
  if (progress >= DONE_THRESHOLD) {
    removeProgress(movie);
    return;
  }

  mutations++;
  const rest = cache.filter((i) => keyOf(i.movie) !== keyOf(movie));
  setCache([{ movie: clean as Movie, progress, currentTime, updatedAt: Date.now() }, ...rest]);

  if (supabase && userId) {
    void supabase.from('watch_progress').upsert({
      user_id: userId,
      media_type: movie.mediaType,
      tmdb_id: movie.tmdbId,
      movie: clean,
      progress,
      current_seconds: currentTime,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,media_type,tmdb_id' }).then(undefined, () => {});
  }
}

export function removeProgress(movie: Movie): void {
  mutations++;
  setCache(cache.filter((i) => keyOf(i.movie) !== keyOf(movie)));
  if (supabase && userId) {
    void supabase.from('watch_progress')
      .delete()
      .eq('user_id', userId)
      .eq('media_type', movie.mediaType)
      .eq('tmdb_id', movie.tmdbId)
      .then(undefined, () => {});
  }
}

// Cross-tab sync (same user, same device).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === storageKey()) {
      cache = sortByRecent(readLocal()).slice(0, MAX_ITEMS);
      emit();
    }
  });
}
