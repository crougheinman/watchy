export interface Movie {
  id: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title: string;
  poster: string;
  backdrop: string;
  description: string;
  year: number;
  rating?: string;
  genres: string[];
  duration?: string;
  matchScore?: number;
  featured?: boolean;
  /** Seconds to resume playback from (set when opened via Continue Watching). */
  resumeTime?: number;
}

export interface MovieCategory {
  id: string;
  title: string;
  movies: Movie[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile: string; // image URL, or '' if none
}

export interface TitleExtras {
  cast: CastMember[];
  similar: Movie[];
  runtime: number | null;
  tagline: string | null;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PlayerEventData {
  event: 'timeupdate' | 'play' | 'pause' | 'ended' | 'seeked';
  currentTime: number;
  duration: number;
  progress: number;
  id: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  timestamp: number;
}

export interface PlayerMessage {
  type: 'PLAYER_EVENT';
  data: PlayerEventData;
}
