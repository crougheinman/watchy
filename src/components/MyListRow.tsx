import { useRef } from 'react';
import type { Movie } from '../types';
import { useMyList } from '../hooks/useMyList';
import { removeFromList } from '../lib/myList';
import MovieCard from './MovieCard';

interface MyListRowProps {
  onMovieClick: (movie: Movie) => void;
}

export default function MyListRow({ onMovieClick }: MyListRowProps) {
  const items = useMyList();
  const rowRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    rowRef.current?.scrollBy({ left: dir === 'right' ? 820 : -820, behavior: 'smooth' });
  };

  return (
    <section className="movie-row">
      <h2 className="movie-row__title">My List</h2>
      <div className="movie-row__track-wrapper">
        <button className="movie-row__arrow movie-row__arrow--left" onClick={() => scroll('left')} aria-label="Scroll left">‹</button>
        <div className="movie-row__track" ref={rowRef}>
          {items.map((movie) => (
            <MovieCard
              key={`${movie.mediaType}-${movie.tmdbId}`}
              movie={movie}
              onRemove={removeFromList}
              onClick={onMovieClick}
            />
          ))}
        </div>
        <button className="movie-row__arrow movie-row__arrow--right" onClick={() => scroll('right')} aria-label="Scroll right">›</button>
      </div>
    </section>
  );
}
