import type { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  /** 0–100 — when set, renders a resume progress bar on the poster. */
  progress?: number;
  /** When set, renders a remove (×) button (used by Continue Watching). */
  onRemove?: (movie: Movie) => void;
}

export default function MovieCard({ movie, onClick, progress, onRemove }: MovieCardProps) {
  return (
    <div className="movie-card" onClick={() => onClick(movie)}>
      {movie.poster
        ? <img
            src={movie.poster}
            alt={movie.title}
            className="movie-card__poster"
            loading="lazy"
          />
        : <div className="movie-card__poster movie-card__poster--empty">🎬</div>
      }

      {onRemove && (
        <button
          className="movie-card__remove"
          aria-label={`Remove ${movie.title} from Continue Watching`}
          onClick={(e) => { e.stopPropagation(); onRemove(movie); }}
        >
          ✕
        </button>
      )}

      <div className="movie-card__overlay">
        <h3 className="movie-card__title">{movie.title}</h3>
        <div className="movie-card__meta">
          {movie.matchScore != null && (
            <span className="movie-card__match">{movie.matchScore}%</span>
          )}
          <span>{movie.year}</span>
          {movie.rating   && <span className="movie-card__cert">{movie.rating}</span>}
          {movie.duration && <span>{movie.duration}</span>}
        </div>
        <p className="movie-card__desc">
          {movie.description.length > 90
            ? movie.description.slice(0, 90) + '…'
            : movie.description}
        </p>
        <div className="movie-card__genres">
          {movie.genres.map((g) => (
            <span key={g} className="genre-tag">{g}</span>
          ))}
        </div>
      </div>

      {progress != null && progress > 0 && (
        <div className="movie-card__progress" aria-hidden="true">
          <div className="movie-card__progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
