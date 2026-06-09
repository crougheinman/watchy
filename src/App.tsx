import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useFetchCategories } from './hooks/useFetchMovies';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import ContinueWatching from './components/ContinueWatching';
import MovieModal from './components/MovieModal';
import SearchOverlay from './components/SearchOverlay';
import LoginPage from './components/LoginPage';
import UpdateRequired from './components/UpdateRequired';
import AccountDisabled from './components/AccountDisabled';
import Maintenance from './components/Maintenance';
import { useAuth } from './hooks/useAuth';
import { useAppVersion } from './hooks/useAppVersion';
import { useAccountStatus } from './hooks/useAccountStatus';
import { APP_NAME } from './constants';
import type { Movie } from './types';
import './App.css';

function App() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { checking: versionChecking, outdated, latest, downloadUrl, maintenance, maintenanceReason } = useAppVersion();
  const { checking: statusChecking, disabled, reason } = useAccountStatus(session?.user?.id);
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useFetchCategories();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Hero rotates through the top 10 trending titles — no separate request.
  const heroMovies = categories?.find((c) => c.id === 'trending')?.movies.slice(0, 10) ?? [];

  // Android hardware back button: close the topmost overlay, else leave the app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapacitorApp.addListener('backButton', () => {
      if (searchOpen) setSearchOpen(false);
      else if (selectedMovie) setSelectedMovie(null);
      else void CapacitorApp.exitApp();
    });
    return () => { void handle.then((h) => h.remove()); };
  }, [searchOpen, selectedMovie]);

  // Outdated builds are signed out so they re-authenticate after updating.
  useEffect(() => {
    if (outdated) void signOut();
  }, [outdated, signOut]);

  const splash = (
    <div className="auth">
      <span className="auth__logo">{APP_NAME}</span>
    </div>
  );

  // Config gates take priority over everything else.
  if (versionChecking) return splash;
  if (maintenance) return <Maintenance reason={maintenanceReason} />;
  if (outdated) return <UpdateRequired latest={latest} downloadUrl={downloadUrl} />;

  // Auth gate: block the app until a session exists.
  if (authLoading) return splash;
  if (!session) return <LoginPage />;

  // Account gate: an admin can disable a user from Supabase.
  if (statusChecking) return splash;
  if (disabled) return <AccountDisabled reason={reason} onSignOut={() => void signOut()} />;

  return (
    <div className="app">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <Hero
        movies={heroMovies}
        loading={categoriesLoading}
        onPlay={setSelectedMovie}
      />

      <main className="app__main">
        {categoriesError && (
          <div className="api-error">
            <span>⚠️</span>
            <p>{categoriesError}</p>
          </div>
        )}
        <ContinueWatching onMovieClick={setSelectedMovie} />
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


