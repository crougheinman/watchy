import { useEffect, useRef, useState } from 'react';
import type { Movie, PlayerMessage } from '../types';

const VIDKING_BASE = 'https://www.vidking.net';
const PLAYER_COLOR = 'e50914';

interface VideoPlayerProps {
  movie: Movie;
  onEvent?: (data: PlayerMessage['data']) => void;
}

function buildEmbedUrl(movie: Movie): string {
  const path =
    movie.mediaType === 'movie'
      ? `/embed/movie/${movie.tmdbId}`
      : `/embed/tv/${movie.tmdbId}/${movie.season ?? 1}/${movie.episode ?? 1}`;

  const params = new URLSearchParams({ color: PLAYER_COLOR, autoPlay: 'true' });

  if (movie.mediaType === 'tv') {
    params.set('episodeSelector', 'true');
    params.set('nextEpisode', 'true');
  }

  return `${VIDKING_BASE}${path}?${params.toString()}`;
}

export default function VideoPlayer({ movie, onEvent }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = buildEmbedUrl(movie);

  useEffect(() => {
    setLoading(true);
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== VIDKING_BASE) return;
      try {
        const parsed = JSON.parse(e.data as string) as PlayerMessage;
        if (parsed.type === 'PLAYER_EVENT' && onEvent) onEvent(parsed.data);
      } catch {
        // non-JSON frames ignored
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [movie, onEvent]);

  return (
    <div className="vk-player">
      {loading && <div className="vk-player__skeleton" />}
      <iframe
        ref={iframeRef}
        src={src}
        className="vk-player__iframe"
        allowFullScreen
        title={`Watch ${movie.title}`}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
