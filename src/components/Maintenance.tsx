import { APP_NAME } from '../constants';

interface MaintenanceProps {
  reason: string | null;
}

export default function Maintenance({ reason }: MaintenanceProps) {
  return (
    <div className="auth maint">
      <div className="auth__card maint__card">
        <div className="maint__icon" aria-hidden="true">🛠️</div>

        <div className="auth__brand">
          <span className="auth__logo">{APP_NAME}</span>
        </div>

        <h1 className="maint__title">We’ll be right back</h1>
        <p className="maint__text">
          {APP_NAME} is down for maintenance while we fix a few things.
          Please check back shortly.
        </p>

        {reason && (
          <div className="maint__reason">
            <span className="maint__reason-label">What’s happening</span>
            <p>{reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
