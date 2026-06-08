import { useEffect, useRef, useState } from 'react';
import type { Movie, PlayerMessage } from '../types';
import { VIDKING_BASE, PLAYER_COLOR } from '../constants';

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

  // Resume from saved position when launched via Continue Watching.
  if (movie.resumeTime && movie.resumeTime > 0) {
    params.set('progress', String(Math.floor(movie.resumeTime)));
  }

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
  }, [onEvent]);

  // Redirect-jack guard: the unsandboxed player can try to navigate the whole
  // tab to an ad page. While the player is open, intercept any unload so a
  // surprise redirect becomes a "Leave site?" prompt the user can cancel.
  // Unmounts with the modal, so it never fires during normal app use.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <div className="vk-player">
      {loading && <div className="vk-player__skeleton" />}
      <iframe
        ref={iframeRef}
        src={src}
        className="vk-player__iframe"
        // NOTE: this provider refuses to run under ANY iframe sandbox, so we
        // can't block its top-navigation / popup ad vector at the frame level.
        // Mitigations instead: no-referrer (don't leak our URL to it), a scoped
        // permissions policy below, the postMessage origin check above, and the
        // beforeunload guard (see effect) that turns a silent redirect-jack into
        // a cancelable prompt. A player that demands an unsandboxed frame is
        // itself the risk flagged in the project analysis.
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        title={`Watch ${movie.title}`}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
