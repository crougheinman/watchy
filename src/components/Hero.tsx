import { useEffect, useRef, useState } from 'react';
import type { Movie } from '../types';
import { fetchTrailerKey } from '../api/tmdb';

interface HeroProps {
  movies: Movie[];
  loading: boolean;
  onPlay: (movie: Movie) => void;
}

// Each trending title stays on screen for 1 minute 30 seconds, then advances.
const SLIDE_MS = 90_000;
const SWIPE_THRESHOLD = 50; // px

export default function Hero({ movies, loading, onPlay }: HeroProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = movies.length;
  // Derived so the index stays valid even if the list size changes — no
  // index-clamping effect needed.
  const safeIndex = count > 0 ? index % count : 0;

  // Muted trailer preview for the current slide (falls back to the backdrop).
  // `trailers` caches fetched keys; `loadedKey` tracks which iframe has loaded;
  // `failed` holds keys YouTube refused to embed (→ keep showing the backdrop).
  const [trailers, setTrailers] = useState<Record<number, string | null>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const currentId = movies[safeIndex]?.id;
  const rawKey = currentId != null ? (trailers[currentId] ?? null) : null;
  const trailerKey = rawKey && !failed.has(rawKey) ? rawKey : null;
  const trailerReady = trailerKey != null && loadedKey === trailerKey;

  useEffect(() => {
    if (currentId == null || currentId in trailers) return; // unfetched only
    let active = true;
    fetchTrailerKey(currentId).then((key) => {
      if (active) setTrailers((m) => ({ ...m, [currentId]: key }));
    });
    return () => { active = false; };
  }, [currentId, trailers]);

  // Detect un-embeddable trailers via the YouTube IFrame API and fall back to
  // the backdrop. Best-effort: if the handshake doesn't take, we simply don't
  // get error events (no regression).
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (typeof e.data !== 'string' || !e.origin.includes('youtube')) return;
      try {
        const d = JSON.parse(e.data) as { event?: string; info?: number };
        if ((d.event === 'onError' || d.event === 'error') && rawKey) {
          setFailed((prev) => (prev.has(rawKey) ? prev : new Set(prev).add(rawKey)));
        } else if (d.event === 'onStateChange' && d.info === 0) {
          // ended → loop without a playlist (which would add prev/next controls).
          const w = e.source as Window | null;
          w?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
          w?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }
      } catch { /* ignore non-JSON frames */ }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [rawKey]);

  // Auto-advance. The timer restarts whenever `index` changes — so a manual
  // swipe/arrow/dot also resets the 1:30 countdown.
  useEffect(() => {
    if (count <= 1) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(id);
  }, [index, count]);

  if (loading || count === 0) {
    return (
      <div className="hero hero--skeleton">
        <div className="hero__content">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--meta" />
          <div className="skeleton skeleton--desc" />
          <div className="skeleton skeleton--actions" />
        </div>
      </div>
    );
  }

  const go = (to: number) => setIndex(((to % count) + count) % count);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) go(safeIndex + (dx < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  const movie = movies[safeIndex];

  return (
    <div className="hero" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Backdrop layer — re-keyed each slide so it cross-fades in. */}
      <div
        key={movie.id}
        className="hero__bg"
        style={{ backgroundImage: `url(${movie.backdrop})` }}
      />

      {/* Muted, looping trailer over the backdrop (fades in once loaded). */}
      {trailerKey && (
        <div className={`hero__trailer${trailerReady ? ' hero__trailer--ready' : ''}`}>
          <iframe
            key={trailerKey}
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`}
            title={`${movie.title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture"
            onLoad={(e) => {
              setLoadedKey(trailerKey);
              // Ask the player to report playback errors so we can fall back.
              const w = e.currentTarget.contentWindow;
              w?.postMessage(JSON.stringify({ event: 'listening' }), '*');
              w?.postMessage(
                JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'] }),
                '*',
              );
              w?.postMessage(
                JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
                '*',
              );
            }}
          />
        </div>
      )}

      <div className="hero__overlay" />

      <div className="hero__content" key={`c-${movie.id}`}>
        <div className="hero__badges">
          {movie.genres.map((g) => (
            <span key={g} className="hero__badge">{g}</span>
          ))}
        </div>
        <h1 className="hero__title">{movie.title}</h1>
        <div className="hero__meta">
          {movie.matchScore && (
            <span className="hero__match">{movie.matchScore}% Match</span>
          )}
          <span>{movie.year}</span>
          {movie.rating && <span className="hero__cert">{movie.rating}</span>}
          {movie.duration && <span>{movie.duration}</span>}
        </div>
        <p className="hero__description">{movie.description}</p>
        <div className="hero__actions">
          <button className="btn btn--play" onClick={() => onPlay(movie)}>
            <span>▶</span> Play
          </button>
          <button className="btn btn--info" onClick={() => onPlay(movie)}>
            <span>ℹ</span> More Info
          </button>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            className="hero__nav hero__nav--left"
            onClick={() => go(safeIndex - 1)}
            aria-label="Previous"
          >‹</button>
          <button
            className="hero__nav hero__nav--right"
            onClick={() => go(safeIndex + 1)}
            aria-label="Next"
          >›</button>

          <div className="hero__dots">
            {movies.map((m, i) => (
              <button
                key={m.id}
                className={`hero__dot${i === safeIndex ? ' hero__dot--active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Go to trending title ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
