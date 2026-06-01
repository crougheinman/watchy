import { useEffect, useRef, useState } from 'react';
import type { Movie } from '../types';
import { useSearch } from '../hooks/useSearch';

interface SearchOverlayProps {
  onClose: () => void;
  onSelect: (movie: Movie) => void;
}

export default function SearchOverlay({ onClose, onSelect }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const { results, loading, error } = useSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);

  /* auto-focus input; close on Escape */
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleSelect(movie: Movie) {
    onClose();
    onSelect(movie);
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-overlay__panel" onClick={(e) => e.stopPropagation()}>

        {/* Search bar */}
        <div className="search-overlay__bar">
          <svg className="search-overlay__icon" viewBox="0 0 24 24" fill="none" width={20} height={20}>
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="search-overlay__input"
            type="text"
            placeholder="Search movies, TV shows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-overlay__clear" onClick={() => setQuery('')} aria-label="Clear">✕</button>
          )}
          <button className="search-overlay__close" onClick={onClose}>Cancel</button>
        </div>

        {/* Body */}
        <div className="search-overlay__body">
          {/* Loading */}
          {loading && (
            <div className="search-overlay__grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="search-card search-card--skeleton">
                  <div className="skeleton search-card__poster" />
                  <div className="skeleton search-card__label" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="search-overlay__msg search-overlay__msg--error">⚠️ {error}</p>
          )}

          {/* Empty query prompt */}
          {!loading && !error && !query && (
            <p className="search-overlay__msg">Start typing to search for movies and TV shows…</p>
          )}

          {/* No results */}
          {!loading && !error && query && results.length === 0 && (
            <p className="search-overlay__msg">No results for <strong>"{query}"</strong></p>
          )}

          {/* Results grid */}
          {!loading && results.length > 0 && (
            <>
              <p className="search-overlay__count">{results.length} result{results.length !== 1 ? 's' : ''} for <strong>"{query}"</strong></p>
              <div className="search-overlay__grid">
                {results.map((movie) => (
                  <button key={`${movie.mediaType}-${movie.id}`} className="search-card" onClick={() => handleSelect(movie)}>
                    {movie.poster
                      ? <img className="search-card__poster" src={movie.poster} alt={movie.title} loading="lazy" />
                      : <div className="search-card__poster search-card__poster--empty">🎬</div>
                    }
                    <div className="search-card__info">
                      <span className={`search-card__type search-card__type--${movie.mediaType}`}>
                        {movie.mediaType === 'tv' ? 'TV' : 'Movie'}
                      </span>
                      <p className="search-card__title">{movie.title}</p>
                      {movie.year > 0 && <p className="search-card__year">{movie.year}</p>}
                      {movie.genres.length > 0 && (
                        <p className="search-card__genres">{movie.genres.slice(0, 2).join(' · ')}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
