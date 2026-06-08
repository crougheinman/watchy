export const APP_NAME    = import.meta.env.VITE_APP_NAME    || 'Watchy';
export const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Stream Everything';

// External services — overridable via .env, with safe defaults.
export const TMDB_API_BASE = import.meta.env.VITE_TMDB_API_BASE   || 'https://db.videasy.net/3';
export const TMDB_IMG_BASE = import.meta.env.VITE_TMDB_IMG_BASE   || 'https://image.tmdb.org/t/p';
export const VIDKING_BASE  = import.meta.env.VITE_VIDKING_BASE_URL || 'https://www.vidking.net';
export const PLAYER_COLOR  = import.meta.env.VITE_PLAYER_COLOR    || 'a3e635';
