import { useState } from 'react';
import { useFetchCategories, useFetchFeatured } from './hooks/useFetchMovies';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import MovieModal from './components/MovieModal';
import SearchOverlay from './components/SearchOverlay';
import { APP_NAME } from './constants';
import type { Movie } from './types';
import './App.css';

function App() {
  const { data: featured, loading: featuredLoading, error: featuredError } = useFetchFeatured();
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useFetchCategories();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="app">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <Hero
        movie={featured}
        loading={featuredLoading}
        onPlay={setSelectedMovie}
      />

      <main className="app__main">
        {(featuredError || categoriesError) && (
          <div className="api-error">
            <span>⚠️</span>
            <p>{featuredError ?? categoriesError}</p>
          </div>
        )}
        {categoriesLoading ? (
          <div className="skeleton-rows">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row-block">
                <div className="skeleton skeleton--row-title" />
                <div className="skeleton skeleton--row-cards" />
              </div>
            ))}
          </div>
        ) : (
          categories?.map((cat) => (
            <MovieRow
              key={cat.id}
              category={cat}
              onMovieClick={setSelectedMovie}
            />
          ))
        )}
      </main>

      <footer className="footer">
        <p className="footer__logo">{APP_NAME}</p>
        <p className="footer__copy">© {new Date().getFullYear()} Watchy, Inc. All rights reserved.</p>
      </footer>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onSelect={(movie) => { setSearchOpen(false); setSelectedMovie(movie); }}
        />
      )}
    </div>
  );
}

export default App;


