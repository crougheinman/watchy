import { useState, useEffect } from 'react';
import { APP_NAME } from '../constants';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  onSearchOpen: () => void;
}

export default function Navbar({ onSearchOpen }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <span className="navbar__logo">{APP_NAME}</span>
      <div className="navbar__right">
        <button className="navbar__search-btn" onClick={onSearchOpen} aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" width={20} height={20}>
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="navbar__user">
          {user?.email && <span className="navbar__email">{user.email}</span>}
          <button className="navbar__signout" onClick={() => void signOut()}>Sign Out</button>
        </div>
      </div>
    </nav>
  );
}
