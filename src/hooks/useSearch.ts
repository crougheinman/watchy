import { useState, useEffect, useRef } from 'react';
import type { Movie } from '../types';
import { fetchSearch } from '../api/tmdb';

interface SearchState {
  results: Movie[];
  loading: boolean;
  error: string | null;
}

export function useSearch(query: string, debounceMs = 350): SearchState {
  const [state, setState] = useState<SearchState>({ results: [], loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      fetchSearch(query)
        .then((results) => setState({ results, loading: false, error: null }))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Search failed';
          setState({ results: [], loading: false, error: msg });
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return state;
}
