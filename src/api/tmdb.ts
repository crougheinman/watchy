import type { Movie, MovieCategory } from '../types';

const BASE_URL = 'https://db.videasy.net/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

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

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Videasy API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function fetchTrending(): Promise<Movie[]> {
  const data = await get<ListResponse>('/trending/movie/week');
  return data.results.filter((m) => m.backdrop_path).map((m) => mapMovie(m));
}

export async function fetchByGenre(
  genreId: number,
  extra: Record<string, string> = {},
): Promise<Movie[]> {
  const data = await get<ListResponse>('/discover/movie', {
    with_genres:      String(genreId),
    sort_by:          'popularity.desc',
    'vote_count.gte': '100',
    ...extra,
  });
  return data.results.map((m) => mapMovie(m));
}

export async function fetchSearch(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];
  const data = await get<ListResponse>('/search/multi', { query: query.trim() });
  return data.results
    .filter((m) => (m.media_type === 'movie' || m.media_type === 'tv') && (m.title ?? m.name))
    .map((m) => mapMovie(m));
}

export async function fetchAllCategories(): Promise<MovieCategory[]> {
  const [trending, action, comedy, scifi, drama, thriller] = await Promise.all([
    fetchTrending(),
    fetchByGenre(28),
    fetchByGenre(35),
    fetchByGenre(878),
    fetchByGenre(18, { sort_by: 'vote_average.desc', 'vote_count.gte': '500' }),
    fetchByGenre(53),
  ]);

  return [
    { id: 'trending',    title: 'Trending Now',       movies: trending },
    { id: 'action',      title: 'Action & Adventure',  movies: action },
    { id: 'comedy',      title: 'Comedy Hits',         movies: comedy },
    { id: 'scifi',       title: 'Sci-Fi & Fantasy',    movies: scifi },
    { id: 'drama',       title: 'Top-Rated Dramas',    movies: drama },
    { id: 'thriller',    title: 'Thrilling Mysteries', movies: thriller },
  ];
}
