import { useEffect, useRef, useState } from 'react';
import type { Movie, PlayerMessage } from '../types';
import type { StreamServer } from '../lib/servers';

interface VideoPlayerProps {
  movie: Movie;
  server: StreamServer;
  /** Ad Shield: block redirect-jacks and pop-ups while the player is open. */
  shield: boolean;
  onEvent?: (data: PlayerMessage['data']) => void;
}

export default function VideoPlayer({ movie, server, shield, onEvent }: VideoPlayerProps) {
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

  // Ad Shield. NOTE: these providers refuse to run inside a sandboxed iframe
  // ("Sandbox not allowed"), so we can't use the frame sandbox to block ads.
  // Instead, while the shield is ON we:
  //   1. Guard top-navigation: a redirect-jack (player sending the whole tab to
  //      an ad page) becomes a cancelable "Leave site?" prompt.
  //   2. Neutralize window.open on our window so any pop-up routed through the
  //      top context is swallowed.
  // (A cross-origin frame's own pop-up tabs can't be closed from here on the
  // web — that needs the native WebView interceptor.)
  useEffect(() => {
    if (!shield) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const realOpen = window.open;
    window.open = function blockedOpen() {
      return null;
    };

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.open = realOpen;
    };
  }, [shield]);

  return (
    <div className="vk-player">
      {loading && <div className="vk-player__skeleton" />}
      <iframe
        ref={iframeRef}
        key={src}
        src={src}
        className="vk-player__iframe"
        // No sandbox: these providers detect it and refuse to play. Layered
        // protections instead: no-referrer (don't leak our URL), a scoped
        // permissions policy below, the postMessage origin check above, and the
        // Ad Shield effect (redirect guard + window.open block).
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        title={`Watch ${movie.title}`}
        onLoad={() => setLoadedSrc(src)}
      />
    </div>
  );
}
