import type { Movie, MovieCategory, TitleExtras } from '../types';
import { TMDB_API_BASE as BASE_URL, TMDB_IMG_BASE as IMG_BASE, TMDB_API_KEY } from '../constants';

const GENRE_MAP: Record<number, string> = {
  28:    'Action',
  12:    'Adventure',
  16:    'Animation',
  35:    'Comedy',
  80:    'Crime',
  99:    'Documentary',
  18:    'Drama',
  10751: 'Family',
  14:    'Fantasy',
  36:    'History',
  27:    'Horror',
  10402: 'Music',
  9648:  'Mystery',
  10749: 'Romance',
  878:   'Sci-Fi',
  53:    'Thriller',
  10752: 'War',
  37:    'Western',
};

interface RawMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
  media_type?: 'movie' | 'tv' | 'person';
}

interface ListResponse {
  results: RawMovie[];
}

function mapMovie(raw: RawMovie, forcedType?: 'movie' | 'tv'): Movie {
  const mediaType = forcedType ?? (raw.media_type === 'tv' ? 'tv' : 'movie');
  const title     = raw.title ?? raw.name ?? 'Untitled';
  const dateStr   = raw.release_date ?? raw.first_air_date ?? '';
  return {
    id:          raw.id,
    tmdbId:      raw.id,
    mediaType,
    title,
    poster:      raw.poster_path   ? `${IMG_BASE}/w500${raw.poster_path}`    : '',
    backdrop:    raw.backdrop_path ? `${IMG_BASE}/w1280${raw.backdrop_path}` : '',
    description: raw.overview,
    year:        dateStr ? Number(dateStr.slice(0, 4)) : 0,
    matchScore:  Math.round(raw.vote_average * 10),
    genres:      raw.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean),
  };
}

async function get<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // TMDB v3 auth: append the API key when configured.
  if (TMDB_API_KEY) url.searchParams.set('api_key', TMDB_API_KEY);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`TMDB API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Brand-new releases almost never have working sources on the embed provider
// ("No sources available"), so the feed targets established catalogue films —
// older and well-voted — which actually play. Tune this ceiling to taste.
const RELEASE_CEILING = '2024-12-31';

export async function fetchTrending(): Promise<Movie[]> {
  // Real "trending this week" feed (not just popularity-sorted catalogue).
  const data = await get<ListResponse>('/trending/movie/week');
  return data.results.filter((m) => m.backdrop_path).map((m) => mapMovie(m));
}

// Netflix's TMDB "watch provider" id. Combined with a watch_region, discover
// returns only titles streaming on Netflix there.
const NETFLIX_PROVIDER_ID = '8';

export async function fetchNetflix(): Promise<Movie[]> {
  const data = await get<ListResponse>('/discover/movie', {
    with_watch_providers:       NETFLIX_PROVIDER_ID,
    watch_region:               'US',
    sort_by:                    'popularity.desc',
    'vote_count.gte':           '100',
    'primary_release_date.lte': RELEASE_CEILING,
    with_original_language:     'en',
  });
  return data.results.filter((m) => m.backdrop_path).map((m) => mapMovie(m));
}

export async function fetchByGenre(
  genreId: number,
  extra: Record<string, string> = {},
): Promise<Movie[]> {
  const data = await get<ListResponse>('/discover/movie', {
    with_genres:                String(genreId),
    sort_by:                    'popularity.desc',
    'vote_count.gte':           '200',
    'primary_release_date.lte': RELEASE_CEILING,
    ...extra,
  });
  return data.results.map((m) => mapMovie(m));
}

interface VideoItem {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}
interface VideosResponse { results: VideoItem[] }

/**
 * Best YouTube trailer/teaser key for a movie, or null if none.
 * Prefers an official Trailer, then any Trailer, then any teaser/clip.
 */
export async function fetchTrailerKey(tmdbId: number, signal?: AbortSignal): Promise<string | null> {
  try {
    const data = await get<VideosResponse>(`/movie/${tmdbId}/videos`, {}, signal);
    const yt = data.results.filter((v) => v.site === 'YouTube');
    const best =
      yt.find((v) => v.type === 'Trailer' && v.official) ||
      yt.find((v) => v.type === 'Trailer') ||
      yt.find((v) => v.type === 'Teaser') ||
      yt[0];
    return best?.key ?? null;
  } catch {
    return null;
  }
}

interface RawCast {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
}
interface DetailsResponse {
  runtime?: number;
  episode_run_time?: number[];
  tagline?: string;
  credits?: { cast?: RawCast[] };
  similar?: ListResponse;
}

/** Cast + similar titles + runtime for the detail modal (one TMDB request). */
export async function fetchTitleExtras(movie: Movie, signal?: AbortSignal): Promise<TitleExtras> {
  const kind = movie.mediaType === 'tv' ? 'tv' : 'movie';
  const data = await get<DetailsResponse>(
    `/${kind}/${movie.tmdbId}`,
    { append_to_response: 'credits,similar' },
    signal,
  );
  const cast = (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character ?? '',
    profile: c.profile_path ? `${IMG_BASE}/w185${c.profile_path}` : '',
  }));
  const similar = (data.similar?.results ?? [])
    .filter((m) => m.poster_path)
    .slice(0, 12)
    .map((m) => mapMovie(m, kind));
  const runtime = data.runtime ?? data.episode_run_time?.[0] ?? null;
  return { cast, similar, runtime, tagline: data.tagline ?? null };
}

export async function fetchSearch(query: string, signal?: AbortSignal): Promise<Movie[]> {
  if (!query.trim()) return [];
  const data = await get<ListResponse>('/search/multi', { query: query.trim() }, signal);
  return data.results
    .filter((m) => (m.media_type === 'movie' || m.media_type === 'tv') && (m.title ?? m.name))
    .map((m) => mapMovie(m));
}

export async function fetchAllCategories(): Promise<MovieCategory[]> {
  const defs: { id: string; title: string; load: () => Promise<Movie[]> }[] = [
    { id: 'trending', title: 'Trending',             load: () => fetchTrending() },
    { id: 'netflix',  title: 'Netflix',             load: () => fetchNetflix() },
    { id: 'action',   title: 'Action & Adventure',  load: () => fetchByGenre(28) },
    { id: 'comedy',   title: 'Comedy Hits',         load: () => fetchByGenre(35) },
    { id: 'scifi',    title: 'Sci-Fi & Fantasy',    load: () => fetchByGenre(878) },
    { id: 'drama',    title: 'Top-Rated Dramas',    load: () => fetchByGenre(18, { sort_by: 'vote_average.desc', 'vote_count.gte': '500' }) },
    { id: 'thriller', title: 'Thrilling Mysteries', load: () => fetchByGenre(53) },
  ];

  const settled = await Promise.allSettled(defs.map((d) => d.load()));

  const categories = defs
    .map((d, i): MovieCategory | null => {
      const r = settled[i];
      return r.status === 'fulfilled' && r.value.length > 0
        ? { id: d.id, title: d.title, movies: r.value }
        : null;
    })
    .filter((c): c is MovieCategory => c !== null);

  // Only fail hard if nothing at all loaded.
  if (categories.length === 0) {
    throw new Error('Could not load any titles. The metadata source may be unavailable.');
  }

  return categories;
}
