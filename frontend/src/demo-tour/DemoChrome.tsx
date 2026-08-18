import { Link } from 'react-router-dom';

export function DemoChrome({
  showTour,
  showAdmin,
  onStartTour,
}: {
  showTour: boolean;
  showAdmin: boolean;
  onStartTour: () => void;
}) {
  return (
    <div className="demo-chrome">
      {showTour && (
        <button type="button" onClick={onStartTour}>
          Демо-тур
        </button>
      )}
      {showAdmin && (
        <Link to="/demo/admin">Admin preview</Link>
      )}
    </div>
  );
}
