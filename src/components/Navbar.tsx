import { useState, useEffect } from 'react';
import { APP_NAME } from '../constants';

interface NavbarProps {
  onSearchOpen: () => void;
}

export default function Navbar({ onSearchOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <span className="navbar__logo">{APP_NAME}</span>
      <ul className="navbar__links">
        <li><a href="#">Home</a></li>
        <li><a href="#">TV Shows</a></li>
        <li><a href="#">Movies</a></li>
        <li><a href="#">New &amp; Popular</a></li>
      </ul>
      <div className="navbar__right">
        <button className="navbar__search-btn" onClick={onSearchOpen} aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" width={20} height={20}>
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="navbar__signin">Sign In</button>
      </div>
    </nav>
  );
}
