import { useState, useEffect } from 'react';
import type { MovieCategory, FetchState } from '../types';
import { fetchAllCategories } from '../api/tmdb';

export function useFetchCategories(): FetchState<MovieCategory[]> {
  const [state, setState] = useState<FetchState<MovieCategory[]>>({
    data: null, loading: true, error: null,
  });

  useEffect(() => {
    let active = true;
    fetchAllCategories()
      .then((data) => { if (active) setState({ data, loading: false, error: null }); })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load categories';
        setState({ data: null, loading: false, error: msg });
      });
    return () => { active = false; };
  }, []);

  return state;
}
