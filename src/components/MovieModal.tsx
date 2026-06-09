import { useCallback, useEffect, useRef, useState } from 'react';
import type { Movie, PlayerEventData } from '../types';
import VideoPlayer from './VideoPlayer';
import ServerIcon from './ServerIcon';
import { upsertProgress } from '../lib/watchHistory';
import { lockLandscape, unlockOrientation } from '../lib/orientation';
import { notifyWatch } from '../lib/notify';
import {
  SERVERS, getServer, getStoredServerId, storeServerId,
  getStoredShield, storeShield,
} from '../lib/servers';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieModal({ movie, onClose }: MovieModalProps) {
  const [progressPct, setProgressPct] = useState(0);
  const [playerEvent, setPlayerEvent] = useState<string>('');
  const [serverId, setServerId] = useState<string>(getStoredServerId);
  const [shield, setShield] = useState<boolean>(getStoredShield);
  const lastSavedRef = useRef(0);
  const notifiedRef = useRef('');
  const server = getServer(serverId);

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
            <h2 className="modal__title">{movie.title}</h2>
            <div className="modal__info">
              {movie.matchScore && (
                <span className="modal__match">{movie.matchScore}% Match</span>
              )}
              <span>{movie.year}</span>
              {movie.rating   && <span className="modal__cert">{movie.rating}</span>}
              {movie.duration && <span>{movie.duration}</span>}
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
      </div>
    </div>
  );
}
