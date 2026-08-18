export function DemoIntro({
  intro,
  onStart,
  onSkip,
}: {
  intro: { title: string; lead: string; bullets: string[]; startLabel: string; skipLabel: string };
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="demo-modal-layer">
      <div className="demo-modal">
        <p className="eyebrow">Guided sales demo</p>
        <h2>{intro.title}</h2>
        <p>{intro.lead}</p>
        <ul>
          {intro.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={onStart}>
            {intro.startLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSkip}>
            {intro.skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
