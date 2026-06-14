import { useCallback, useEffect, useRef, useState } from 'react';
import type { Movie, PlayerEventData, TitleExtras } from '../types';
import VideoPlayer from './VideoPlayer';
import ServerIcon from './ServerIcon';
import { upsertProgress } from '../lib/watchHistory';
import { lockLandscape, unlockOrientation } from '../lib/orientation';
import { notifyWatch } from '../lib/notify';
import { fetchTitleExtras } from '../api/tmdb';
import { useMyList } from '../hooks/useMyList';
import { toggleList, isInList } from '../lib/myList';
import {
  SERVERS, getServer, getStoredServerId, storeServerId,
  getStoredShield, storeShield,
} from '../lib/servers';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
  /** Open a related title (swaps the modal to it). */
  onSelectRelated?: (movie: Movie) => void;
}

export default function MovieModal({ movie, onClose, onSelectRelated }: MovieModalProps) {
  const [progressPct, setProgressPct] = useState(0);
  const [playerEvent, setPlayerEvent] = useState<string>('');
  const [serverId, setServerId] = useState<string>(getStoredServerId);
  const [shield, setShield] = useState<boolean>(getStoredShield);
  const [extras, setExtras] = useState<{ key: string; data: TitleExtras } | null>(null);
  const lastSavedRef = useRef(0);
  const notifiedRef = useRef('');
  const server = getServer(serverId);
  const movieKey = `${movie.mediaType}-${movie.tmdbId}`;
  // Only use extras that belong to the current title (auto-clears on change).
  const currentExtras = extras && extras.key === movieKey ? extras.data : null;

  // Re-render the My List button when the list changes; compute saved state.
  useMyList();
  const saved = isInList(movie);

  function handleServerChange(id: string) {
    setServerId(id);
    storeServerId(id);
  }

  function toggleShield() {
    setShield((prev) => {
      const next = !prev;
      storeShield(next);
      return next;
    });
  }

  /* Force landscape while the player is open; restore on close. */
  useEffect(() => {
    void lockLandscape();
    return () => { void unlockOrientation(); };
  }, []);

  /* Notify Telegram once per opened title ("user is watching …"). */
  useEffect(() => {
    const key = `${movie.mediaType}-${movie.tmdbId}`;
    if (notifiedRef.current === key) return;
    notifiedRef.current = key;
    notifyWatch(movie);
  }, [movie]);

  /* Fetch cast + similar for the current title. */
  useEffect(() => {
    let active = true;
    const ctrl = new AbortController();
    fetchTitleExtras(movie, ctrl.signal)
      .then((data) => { if (active) setExtras({ key: movieKey, data }); })
      .catch(() => { /* leave extras as-is */ });
    return () => { active = false; ctrl.abort(); };
  }, [movie, movieKey]);

  /* close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handlePlayerEvent = useCallback((data: PlayerEventData) => {
    const pct = data.progress ?? 0;
    const currentTime = data.currentTime ?? 0;
    setProgressPct(pct);
    setPlayerEvent(data.event);

    // Persist for Continue Watching. Save on discrete events, and throttle the
    // high-frequency timeupdate stream to roughly every 5s of playback.
    const save =
      data.event === 'pause' ||
      data.event === 'ended' ||
      data.event === 'seeked' ||
      (data.event === 'timeupdate' && Math.abs(currentTime - lastSavedRef.current) >= 5);

    if (save && pct > 0) {
      lastSavedRef.current = currentTime;
      upsertProgress(movie, pct, currentTime);
    }
  }, [movie]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>

        {/* Player */}
        <VideoPlayer movie={movie} server={server} shield={shield} onEvent={handlePlayerEvent} />

        {/* Player controls — server source + ad shield */}
        <div className="modal__servers">
          <span className="modal__servers-label">Server</span>
          <div className="modal__servers-list">
            {SERVERS.map((s) => (
              <button
                key={s.id}
                className={`server-chip${s.id === serverId ? ' server-chip--active' : ''}`}
                onClick={() => handleServerChange(s.id)}
              >
                <ServerIcon kind={s.icon} />
                {s.label}
              </button>
            ))}
          </div>

          <button
            className={`shield-toggle${shield ? ' shield-toggle--on' : ''}`}
            onClick={toggleShield}
            aria-pressed={shield}
            title={shield
              ? 'Ad Shield ON — blocks redirect-jacks & pop-ups'
              : 'Ad Shield OFF — the player can redirect the tab or open ad tabs'}
          >
            <span aria-hidden="true">{shield ? '🛡️' : '⚠️'}</span>
            Ad Shield: {shield ? 'On' : 'Off'}
          </button>

          <span className="modal__servers-hint">
            {shield
              ? 'Ad Shield blocks tab redirects & pop-ups. Some ads inside the player can’t be blocked on the web.'
              : 'Ad Shield is off — the player may redirect the tab or open ad tabs.'}
          </span>
        </div>

        {/* Progress bar */}
        {progressPct > 0 && (
          <div className="modal__progress-track">
            <div className="modal__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* Meta */}
        <div className="modal__meta">
          <div className="modal__meta-left">
            <div className="modal__title-row">
              <h2 className="modal__title">{movie.title}</h2>
              <button
                className={`mylist-btn${saved ? ' mylist-btn--on' : ''}`}
                onClick={() => toggleList(movie)}
                aria-pressed={saved}
              >
                {saved ? '✓ My List' : '+ My List'}
              </button>
            </div>
            <div className="modal__info">
              {movie.matchScore && (
                <span className="modal__match">{movie.matchScore}% Match</span>
              )}
              <span>{movie.year}</span>
              {movie.rating   && <span className="modal__cert">{movie.rating}</span>}
              {(movie.duration || currentExtras?.runtime) && (
                <span>{movie.duration ?? `${currentExtras?.runtime}m`}</span>
              )}
              {playerEvent && (
                <span className="modal__event-badge">{playerEvent}</span>
              )}
            </div>
            <p className="modal__desc">{movie.description}</p>
          </div>
          <div className="modal__meta-right">
            <p className="modal__genres-label">Genres</p>
            <div className="modal__genres">
              {movie.genres.map((g) => (
                <span key={g} className="genre-tag">{g}</span>
              ))}
            </div>
            {progressPct > 0 && (
              <p className="modal__watch-pct">{progressPct.toFixed(1)}% watched</p>
            )}
          </div>
        </div>

        {/* Cast */}
        {currentExtras && currentExtras.cast.length > 0 && (
          <div className="modal__section">
            <h3 className="modal__section-title">Cast</h3>
            <div className="cast-row">
              {currentExtras.cast.map((c) => (
                <div key={c.id} className="cast-card">
                  {c.profile
                    ? <img className="cast-card__photo" src={c.profile} alt={c.name} loading="lazy" />
                    : <div className="cast-card__photo cast-card__photo--empty">🎭</div>}
                  <p className="cast-card__name">{c.name}</p>
                  {c.character && <p className="cast-card__role">{c.character}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More Like This */}
        {currentExtras && currentExtras.similar.length > 0 && onSelectRelated && (
          <div className="modal__section">
            <h3 className="modal__section-title">More Like This</h3>
            <div className="similar-grid">
              {currentExtras.similar.map((m) => (
                <button
                  key={`${m.mediaType}-${m.tmdbId}`}
                  className="similar-card"
                  onClick={() => onSelectRelated(m)}
                >
                  {m.poster
                    ? <img className="similar-card__poster" src={m.poster} alt={m.title} loading="lazy" />
                    : <div className="similar-card__poster similar-card__poster--empty">🎬</div>}
                  <span className="similar-card__title">{m.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
