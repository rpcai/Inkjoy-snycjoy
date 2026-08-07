export function SyncjoyLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`syncjoy-logo ${compact ? "compact" : ""}`} aria-label="InkJoy Syncjoy">
      <span className="syncjoy-mark" aria-hidden="true">
        <span className="syncjoy-frame">
          <span className="syncjoy-ink-line" />
          <span className="syncjoy-ink-line short" />
        </span>
        <span className="syncjoy-photo-petal blue" />
        <span className="syncjoy-photo-petal red" />
        <span className="syncjoy-photo-petal yellow" />
        <span className="syncjoy-photo-petal green" />
      </span>
      <span className="syncjoy-wordmark">
        <span>InkJoy</span>
        <strong>Syncjoy</strong>
      </span>
    </span>
  );
}
