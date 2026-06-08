import { useRef } from 'react';
import type { Movie } from '../types';
import { useContinueWatching } from '../hooks/useContinueWatching';
import { removeProgress } from '../lib/watchHistory';
import MovieCard from './MovieCard';

interface ContinueWatchingProps {
  onMovieClick: (movie: Movie) => void;
}

export default function ContinueWatching({ onMovieClick }: ContinueWatchingProps) {
  const items = useContinueWatching();
  const rowRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    rowRef.current?.scrollBy({
      left: dir === 'right' ? 820 : -820,
      behavior: 'smooth',
    });
  };

  return (
    <section className="movie-row">
      <h2 className="movie-row__title">Continue Watching</h2>
      <div className="movie-row__track-wrapper">
        <button
          className="movie-row__arrow movie-row__arrow--left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div className="movie-row__track" ref={rowRef}>
          {items.map((item) => (
            <MovieCard
              key={`${item.movie.mediaType}-${item.movie.tmdbId}`}
              movie={item.movie}
              progress={item.progress}
              onRemove={removeProgress}
              onClick={(m) => onMovieClick({ ...m, resumeTime: item.currentTime })}
            />
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
