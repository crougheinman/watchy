import type { Movie } from '../types';
import { supabase } from './supabase';

/**
 * "My List" store. Cloud-synced per user via Supabase `user_library`, with a
 * localStorage cache for instant load + offline. Pub/sub for useSyncExternalStore.
 *
 * Call initMyList(userId) when the user is known; clearMyList() on sign-out.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let userId: string | null = null;
let cache: Movie[] = [];
let mutations = 0; // bumped on every local add/remove (guards the init race)

const keyOf = (m: Pick<Movie, 'mediaType' | 'tmdbId'>) => `${m.mediaType}-${m.tmdbId}`;
const storageKey = () => `watchy:mylist:${userId ?? 'anon'}`;

function readLocal(): Movie[] {
  try {
    const raw = localStorage.getItem(storageKey());
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Movie[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: Movie[]): void {
  try { localStorage.setItem(storageKey(), JSON.stringify(items)); } catch { /* ignore */ }
}

function emit(): void { listeners.forEach((l) => l()); }

function setCache(items: Movie[]): void {
  cache = items;
  writeLocal(items);
  emit();
}

export function getMyList(): Movie[] { return cache; }

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isInList(movie: Movie): boolean {
  return cache.some((m) => keyOf(m) === keyOf(movie));
}

export async function initMyList(uid: string | null): Promise<void> {
  userId = uid;
  cache = readLocal();
  emit();
  if (!supabase || !uid) return;
  const startMutations = mutations;
  try {
    const { data, error } = await supabase
      .from('user_library')
      .select('movie, added_at')
      .eq('user_id', uid)
      .order('added_at', { ascending: false });
    // Skip the cloud snapshot if the user changed, or made a local edit while
    // the fetch was in flight (otherwise we'd clobber their optimistic change).
    if (error || !data || userId !== uid || mutations !== startMutations) return;
    setCache(data.map((r) => r.movie as Movie));
  } catch {
    /* offline — keep the local cache */
  }
}

export function clearMyList(): void {
  userId = null;
  cache = [];
  emit();
}

export function addToList(movie: Movie): void {
  if (isInList(movie)) return;
  const { resumeTime: _omit, ...clean } = movie;
  void _omit;
  mutations++;
  setCache([clean as Movie, ...cache]);
  if (supabase && userId) {
    void supabase.from('user_library').upsert({
      user_id: userId,
      media_type: movie.mediaType,
      tmdb_id: movie.tmdbId,
      movie: clean,
    }, { onConflict: 'user_id,media_type,tmdb_id' }).then(undefined, () => {});
  }
}

export function removeFromList(movie: Movie): void {
  mutations++;
  setCache(cache.filter((m) => keyOf(m) !== keyOf(movie)));
  if (supabase && userId) {
    void supabase.from('user_library')
      .delete()
      .eq('user_id', userId)
      .eq('media_type', movie.mediaType)
      .eq('tmdb_id', movie.tmdbId)
      .then(undefined, () => {});
  }
}

export function toggleList(movie: Movie): void {
  if (isInList(movie)) removeFromList(movie);
  else addToList(movie);
}

// Cross-tab sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === storageKey()) { cache = readLocal(); emit(); }
  });
}
