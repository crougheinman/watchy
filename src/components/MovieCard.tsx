import type { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  return (
    <div className="movie-card" onClick={() => onClick(movie)}>
      <img
        src={movie.poster}
        alt={movie.title}
        className="movie-card__poster"
        loading="lazy"
      />
      <div className="movie-card__overlay">
        <h3 className="movie-card__title">{movie.title}</h3>
        <div className="movie-card__meta">
          {movie.matchScore && (
            <span className="movie-card__match">{movie.matchScore}%</span>
          )}
          <span>{movie.year}</span>
          <span className="movie-card__cert">{movie.rating}</span>
          <span>{movie.duration}</span>
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
    </div>
  );
}
