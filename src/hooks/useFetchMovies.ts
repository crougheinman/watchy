import { useState, useEffect } from 'react';
import type { Movie, MovieCategory, FetchState } from '../types';
import { fetchTrending, fetchAllCategories } from '../api/tmdb';

export function useFetchFeatured(): FetchState<Movie> {
  const [state, setState] = useState<FetchState<Movie>>({
    data: null, loading: true, error: null,
  });

  useEffect(() => {
    fetchTrending()
      .then((movies) => {
        const featured = movies.find((m) => m.backdrop) ?? movies[0];
        setState({ data: { ...featured, featured: true }, loading: false, error: null });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load featured movie';
        setState({ data: null, loading: false, error: msg });
      });
  }, []);

  return state;
}

export function useFetchCategories(): FetchState<MovieCategory[]> {
  const [state, setState] = useState<FetchState<MovieCategory[]>>({
    data: null, loading: true, error: null,
  });

  useEffect(() => {
    fetchAllCategories()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load categories';
        setState({ data: null, loading: false, error: msg });
      });
  }, []);

  return state;
}
