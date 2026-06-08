import { useEffect, useRef, useState } from 'react';
import type { Movie, PlayerMessage } from '../types';
import type { StreamServer } from '../lib/servers';

interface VideoPlayerProps {
  movie: Movie;
  server: StreamServer;
  onEvent?: (data: PlayerMessage['data']) => void;
}

export default function VideoPlayer({ movie, server, onEvent }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = server.build(movie);

  // Derive the spinner from which src has loaded — this auto-resets when the
  // source changes (e.g. switching servers) without a state-resetting effect.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loading = loadedSrc !== src;

  // Progress events only come from trackable providers; validate by origin.
  useEffect(() => {
    if (!server.trackable || !server.origin || !onEvent) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== server.origin) return;
      try {
        const parsed = JSON.parse(e.data as string) as PlayerMessage;
        if (parsed.type === 'PLAYER_EVENT') onEvent(parsed.data);
      } catch {
        // non-JSON frames ignored
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [server, onEvent]);

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
        key={src}
        src={src}
        className="vk-player__iframe"
        // NOTE: these providers refuse to run under ANY iframe sandbox, so we
        // can't block their top-navigation / popup ad vector at the frame level.
        // Mitigations instead: no-referrer (don't leak our URL to it), a scoped
        // permissions policy below, the postMessage origin check above, and the
        // beforeunload guard (see effect) that turns a silent redirect-jack into
        // a cancelable prompt. A player that demands an unsandboxed frame is
        // itself the risk flagged in the project analysis.
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        title={`Watch ${movie.title}`}
        onLoad={() => setLoadedSrc(src)}
      />
    </div>
  );
}
