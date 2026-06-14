import { useState } from 'react';

const DISMISS_KEY = 'watchy:annDismissed';

interface AnnouncementBannerProps {
  text: string | null;
}

/** App-wide announcement bar, set from Supabase app_config.announcement.
 *  Dismissal is keyed by the text, so a new/changed announcement re-shows.
 *  Visibility is derived from the live `text` prop (which updates via polling),
 *  not frozen at mount. */
export default function AnnouncementBanner({ text }: AnnouncementBannerProps) {
  const [dismissedText, setDismissedText] = useState<string | null>(() => {
    try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
  });

  if (!text || dismissedText === text) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, text); } catch { /* ignore */ }
    setDismissedText(text);
  };

  return (
    <div className="announce" role="status">
      <span className="announce__icon" aria-hidden="true">📢</span>
      <p className="announce__text">{text}</p>
      <button className="announce__close" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
