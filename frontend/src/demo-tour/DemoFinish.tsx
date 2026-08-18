export function DemoFinish({
  finish,
  showAdmin,
  onAdmin,
  onContinue,
}: {
  finish: { title: string; lead: string; bullets: string[]; adminLabel: string; continueLabel: string };
  showAdmin: boolean;
  onAdmin: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="demo-modal-layer">
      <div className="demo-modal">
        <h2>{finish.title}</h2>
        <p>{finish.lead}</p>
        <ul>
          {finish.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="row-actions">
          {showAdmin && (
            <button type="button" className="btn btn-primary" onClick={onAdmin}>
              {finish.adminLabel}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onContinue}>
            {finish.continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
