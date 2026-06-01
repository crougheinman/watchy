import { useRef } from 'react';
import type { MovieCategory } from '../types';
import type { Movie } from '../types';
import MovieCard from './MovieCard';

interface MovieRowProps {
  category: MovieCategory;
  onMovieClick: (movie: Movie) => void;
}

export default function MovieRow({ category, onMovieClick }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (rowRef.current) {
      rowRef.current.scrollBy({
        left: dir === 'right' ? 820 : -820,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="movie-row">
      <h2 className="movie-row__title">{category.title}</h2>
      <div className="movie-row__track-wrapper">
        <button
          className="movie-row__arrow movie-row__arrow--left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div className="movie-row__track" ref={rowRef}>
          {category.movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} />
          ))}
        </div>
        <button
          className="movie-row__arrow movie-row__arrow--right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  );
}
