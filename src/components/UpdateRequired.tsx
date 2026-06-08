import { APP_NAME, APP_VERSION } from '../constants';
import { openExternal } from '../lib/external';

interface UpdateRequiredProps {
  latest: string | null;
  downloadUrl: string;
}

export default function UpdateRequired({ latest, downloadUrl }: UpdateRequiredProps) {
  return (
    <div className="auth update">
      <div className="auth__card update__card">
        <div className="update__icon" aria-hidden="true">⬆️</div>

        <div className="auth__brand">
          <span className="auth__logo">{APP_NAME}</span>
        </div>

        <h1 className="update__title">Update required</h1>
        <p className="update__text">
          A newer version of {APP_NAME} is available. Please download and install
          the latest version to keep watching.
        </p>

        <div className="update__versions">
          <span>Your version: <strong>{APP_VERSION}</strong></span>
          {latest && <span>Latest version: <strong>{latest}</strong></span>}
        </div>

        <button className="auth__submit update__btn" onClick={() => void openExternal(downloadUrl)}>
          Download latest version
        </button>

        <p className="update__hint">
          You’ve been signed out. After updating, open the app and sign in again.
        </p>
      </div>
    </div>
  );
}
