import { supabase } from './supabase';
import type { Movie } from '../types';

/**
 * Fire-and-forget: tell the notify-watch Edge Function that the current user
 * opened a title, so it can ping Telegram with the poster. Never throws and
 * never blocks the UI; silently no-ops when Supabase isn't configured.
 */
export function notifyWatch(movie: Movie): void {
  if (!supabase) return;
  void supabase.functions
    .invoke('notify-watch', {
      body: {
        title: movie.title,
        image: movie.backdrop || movie.poster || '',
        year: movie.year,
        mediaType: movie.mediaType,
        genres: movie.genres.slice(0, 3).join(' · '),
      },
    })
    .then(() => {}, () => {});
}
