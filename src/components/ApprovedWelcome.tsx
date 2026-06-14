import { APP_NAME } from '../constants';

interface ApprovedWelcomeProps {
  onDismiss: () => void;
}

/** Shown once when a previously-screened account is approved while the app is open. */
export default function ApprovedWelcome({ onDismiss }: ApprovedWelcomeProps) {
  return (
    <div className="modal-backdrop" onClick={onDismiss}>
      <div className="auth__card welcome__card" onClick={(e) => e.stopPropagation()}>
        <div className="welcome__icon" aria-hidden="true">🎉</div>
        <h1 className="welcome__title">You’re approved!</h1>
        <p className="welcome__text">
          Your account has been approved — welcome to {APP_NAME}. Enjoy the show.
        </p>
        <button className="auth__submit welcome__btn" onClick={onDismiss}>
          Start watching
        </button>
      </div>
    </div>
  );
}
