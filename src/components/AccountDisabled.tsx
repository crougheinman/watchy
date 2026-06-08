import { APP_NAME } from '../constants';

interface AccountDisabledProps {
  reason: string | null;
  onSignOut: () => void;
}

export default function AccountDisabled({ reason, onSignOut }: AccountDisabledProps) {
  return (
    <div className="auth disabled">
      <div className="auth__card disabled__card">
        <div className="disabled__icon" aria-hidden="true">🚫</div>

        <div className="auth__brand">
          <span className="auth__logo">{APP_NAME}</span>
        </div>

        <h1 className="disabled__title">Account disabled</h1>
        <p className="disabled__text">
          Your account has been disabled and you can no longer access {APP_NAME}.
          Please contact the administrator to have your account restored.
        </p>

        {reason && (
          <div className="disabled__reason">
            <span className="disabled__reason-label">Reason</span>
            <p>{reason}</p>
          </div>
        )}

        <button className="auth__submit disabled__btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
