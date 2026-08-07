export function Importing(props: { done: number; total: number }) {
  const pct = props.total ? Math.round((props.done / props.total) * 100) : 0;

  return (
    <div className="importing-screen">
      <div className="importing-spinner" />
      <h2>Adding photos…</h2>
      <p>
        {props.done} of {props.total} uploaded
      </p>
      <div className="importing-progress-track">
        <div className="importing-progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
