import type { Movie } from '../types';

interface HeroProps {
  movie: Movie | null;
  loading: boolean;
  onPlay: (movie: Movie) => void;
}

export default function Hero({ movie, loading, onPlay }: HeroProps) {
  if (loading || !movie) {
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

  return (
    <div
      className="hero"
      style={{ backgroundImage: `url(${movie.backdrop})` }}
    >
      <div className="hero__overlay" />
      <div className="hero__content">
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
    </div>
  );
}
