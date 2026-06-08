import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME, APP_TAGLINE } from '../constants';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice('Check your inbox to confirm your email, then sign in.');
      setMode('signin');
      setPassword('');
    }
    // On success with a session, the auth listener swaps this page out.
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__logo">{APP_NAME}</span>
          <span className="auth__tagline">{APP_TAGLINE}</span>
        </div>

        {!configured && (
          <p className="auth__msg auth__msg--error">
            ⚠️ Auth isn’t configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code>.
          </p>
        )}

        <div className="auth__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth__tab${mode === 'signin' ? ' auth__tab--active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth__tab${mode === 'signup' ? ' auth__tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label className="auth__field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy || !configured}
            />
          </label>

          <label className="auth__field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              disabled={busy || !configured}
            />
          </label>

          {error && <p className="auth__msg auth__msg--error">{error}</p>}
          {notice && <p className="auth__msg auth__msg--ok">{notice}</p>}

          <button type="submit" className="auth__submit" disabled={busy || !configured}>
            {busy
              ? 'Please wait…'
              : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth__switch">
          {mode === 'signin' ? (
            <>New here? <button type="button" onClick={() => switchMode('signup')}>Create an account</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => switchMode('signin')}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
