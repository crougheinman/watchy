import type { Movie } from '../types';
import type { ServerIconKind } from '../components/ServerIcon';
import { VIDKING_BASE, PLAYER_COLOR } from '../constants';

/**
 * Stream-source registry. Each embed provider has its own URL shape, so a
 * server owns its own `build()`. When one provider is down, the user can pick
 * another from the player's Server menu.
 *
 * `trackable` servers emit postMessage progress events we can persist to
 * Continue Watching; `origin` is the exact origin used to validate those
 * events. Non-trackable providers still play — they just don't report progress.
 *
 * NOTE: third-party embed URL formats change over time. If a provider stops
 * resolving, adjust its `build()` here — that's the only place to touch.
 */
export interface StreamServer {
  id: string;
  label: string;
  icon: ServerIconKind;
  trackable: boolean;
  origin?: string;
  build: (movie: Movie) => string;
}

const ep = (m: Movie) => ({ s: m.season ?? 1, e: m.episode ?? 1 });

export const SERVERS: StreamServer[] = [
  {
    id: 'vidking',
    label: 'Maki',
    icon: 'browndog',
    trackable: true,
    origin: VIDKING_BASE,
    build: (movie) => {
      const path = movie.mediaType === 'movie'
        ? `/embed/movie/${movie.tmdbId}`
        : `/embed/tv/${movie.tmdbId}/${ep(movie).s}/${ep(movie).e}`;
      const params = new URLSearchParams({ color: PLAYER_COLOR, autoPlay: 'true' });
      if (movie.resumeTime && movie.resumeTime > 0) params.set('progress', String(Math.floor(movie.resumeTime)));
      if (movie.mediaType === 'tv') {
        params.set('episodeSelector', 'true');
        params.set('nextEpisode', 'true');
      }
      return `${VIDKING_BASE}${path}?${params.toString()}`;
    },
  },
  {
    id: 'videasy',
    label: 'Litol',
    icon: 'browndog',
    trackable: true,
    origin: 'https://player.videasy.net',
    build: (movie) => {
      const path = movie.mediaType === 'movie'
        ? `/movie/${movie.tmdbId}`
        : `/tv/${movie.tmdbId}/${ep(movie).s}/${ep(movie).e}`;
      const params = new URLSearchParams({ color: PLAYER_COLOR });
      if (movie.resumeTime && movie.resumeTime > 0) params.set('progress', String(Math.floor(movie.resumeTime)));
      if (movie.mediaType === 'tv') {
        params.set('episodeSelector', 'true');
        params.set('nextEpisode', 'true');
      }
      return `https://player.videasy.net${path}?${params.toString()}`;
    },
  },
  {
    id: 'vidlink',
    label: 'Pipip',
    icon: 'whitedog',
    trackable: false,
    build: (movie) =>
      movie.mediaType === 'movie'
        ? `https://vidlink.pro/movie/${movie.tmdbId}`
        : `https://vidlink.pro/tv/${movie.tmdbId}/${ep(movie).s}/${ep(movie).e}`,
  },
  {
    id: 'vidsrc',
    label: 'Vito',
    icon: 'orangecat',
    trackable: false,
    build: (movie) =>
      movie.mediaType === 'movie'
        ? `https://vidsrc.me/embed/movie?tmdb=${movie.tmdbId}`
        : `https://vidsrc.me/embed/tv?tmdb=${movie.tmdbId}&season=${ep(movie).s}&episode=${ep(movie).e}`,
  },
  {
    id: '2embed',
    label: 'Clippant',
    icon: 'orangecat',
    trackable: false,
    build: (movie) =>
      movie.mediaType === 'movie'
        ? `https://www.2embed.cc/embed/${movie.tmdbId}`
        : `https://www.2embed.cc/embedtv/${movie.tmdbId}&s=${ep(movie).s}&e=${ep(movie).e}`,
  },
  {
    id: 'superembed',
    label: 'Bart',
    icon: 'orangecat',
    trackable: false,
    // SuperEmbed's embed API is served from multiembed.mov.
    build: (movie) => {
      const q = new URLSearchParams({ video_id: String(movie.tmdbId), tmdb: '1' });
      if (movie.mediaType === 'tv') {
        q.set('s', String(ep(movie).s));
        q.set('e', String(ep(movie).e));
      }
      return `https://multiembed.mov/?${q.toString()}`;
    },
  },
];

export const DEFAULT_SERVER = SERVERS[0];

export function getServer(id: string | null | undefined): StreamServer {
  return SERVERS.find((s) => s.id === id) ?? DEFAULT_SERVER;
}

// Remember the user's last working server across sessions.
const STORAGE_KEY = 'watchy:server';

export function getStoredServerId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SERVER.id;
  } catch {
    return DEFAULT_SERVER.id;
  }
}

export function storeServerId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* quota / private mode — ignore */
  }
}

// Ad Shield preference — on by default (blocks pop-up/redirect ads).
const SHIELD_KEY = 'watchy:shield';

export function getStoredShield(): boolean {
  try {
    return localStorage.getItem(SHIELD_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function storeShield(on: boolean): void {
  try {
    localStorage.setItem(SHIELD_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}
