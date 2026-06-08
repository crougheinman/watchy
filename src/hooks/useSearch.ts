import { useState, useEffect, useRef } from 'react';
import type { Movie } from '../types';
import { fetchSearch } from '../api/tmdb';

interface SearchState {
  results: Movie[];
  loading: boolean;
  error: string | null;
}

interface InternalState {
  results: Movie[];
  forQuery: string; // the query these results / error belong to
  error: string | null;
}

export function useSearch(query: string, debounceMs = 350): SearchState {
  const [state, setState] = useState<InternalState>({ results: [], forQuery: '', error: null });
  const abortRef = useRef<AbortController | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return; // nothing to fetch; empty state is derived below

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchSearch(trimmed, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setState({ results, forQuery: trimmed, error: null });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return; // superseded by a newer query
          const msg = err instanceof Error ? err.message : 'Search failed';
          setState({ results: [], forQuery: trimmed, error: msg });
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort(); // cancel in-flight request on unmount / query change
    };
  }, [trimmed, debounceMs]);

  // Derive the public state — loading is true whenever the stored results don't
  // yet correspond to the current query. No setState-in-effect, no refs-in-render.
  if (!trimmed) return { results: [], loading: false, error: null };
  const settled = state.forQuery === trimmed;
  return {
    results: settled ? state.results : [],
    loading: !settled,
    error: settled ? state.error : null,
  };
}
