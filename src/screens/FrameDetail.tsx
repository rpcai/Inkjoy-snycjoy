import { ArrowLeft, Monitor } from "lucide-react";
import { api } from "../lib/api";
import type { Carousel, Device } from "../types";

export function FrameDetail(props: {
  device: Device;
  carousels: Carousel[];
  onBack: () => void;
  onEditSlideshow: () => void;
  onPlayNow: () => void;
}) {
  const active = props.carousels.find((carousel) => carousel.status === "ACTIVE" && carousel.albumIdList?.length);
  const landscape = props.device.orientation === 90 || props.device.orientation === 270;
  const ticks = scheduleTicks(active);

  return (
    <div className="mobile-screen">
      <div className="mobile-app-bar">
        <button type="button" className="icon-btn-ghost" onClick={props.onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="mobile-app-bar-title">
          <strong>{props.device.deviceName || "Frame"}</strong>
        </div>
        <span className="mobile-app-bar-spacer" />
      </div>

      <div className="mobile-screen-body">
        <div className="frame-detail-hero">
          <div className={`device-frame frame-detail-bezel ${landscape ? "landscape" : ""}`}>
            {props.device.lastPlayThumbnailUrl ? (
              <img src={api.devicePreviewUrl(props.device.lastPlayThumbnailUrl)} alt="" />
            ) : (
              <Monitor size={34} />
            )}
          </div>
          <span className="frame-detail-caption">
            {props.device.resolution?.width || "—"} × {props.device.resolution?.height || "—"} ·{" "}
            {landscape ? "landscape" : "portrait"}
          </span>
        </div>

        <div className="frame-schedule-panel">
          <div className="frame-schedule-header">
            <div>
              <strong>{active?.albumList?.map((album) => album.albumName).join(", ") || "No active slideshow"}</strong>
              {active ? <span className="status-badge active">Active</span> : null}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={props.onEditSlideshow}>
              Edit
            </button>
          </div>

          {active ? (
            <>
              <div className="frame-schedule-track">
                {ticks.map((hour) => (
                  <i key={hour} style={{ left: `${(hour / 24) * 100}%` }} />
                ))}
              </div>
              <div className="frame-schedule-summary">
                Every {active.intervalMinutes || 120} min · {active.beginTime || "09:00"}–{active.endTime || "18:00"}
              </div>

              <dl className="frame-schedule-list">
                <div>
                  <dt>Play order</dt>
                  <dd>{active.playOrder === "SHUFFLE" ? "Shuffle" : "Sequential"}</dd>
                </div>
                <div>
                  <dt>Repeat every</dt>
                  <dd>{active.updateDays || 1} day(s)</dd>
                </div>
                <div>
                  <dt>Between refreshes</dt>
                  <dd>{active.idle ? "Stay on" : "Sleep"}</dd>
                </div>
                <div>
                  <dt>Timezone</dt>
                  <dd>{active.timezone || "—"}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="empty-state compact">No active slideshow schedule.</div>
          )}
        </div>

        {active ? (
          <button type="button" className="btn btn-secondary btn-primary-block" onClick={props.onPlayNow}>
            Play now
          </button>
        ) : null}
      </div>
    </div>
  );
}

function scheduleTicks(carousel?: Carousel): number[] {
  if (!carousel) return [];

  if (carousel.updateTimeList?.length) {
    return carousel.updateTimeList
      .map((time) => Number(time.split(":")[0]))
      .filter((hour) => Number.isFinite(hour));
  }

  const begin = Number(carousel.beginTime?.split(":")[0] ?? 9);
  const end = Number(carousel.endTime?.split(":")[0] ?? 18);
  const stepHours = Math.max(1, Math.round((carousel.intervalMinutes || 120) / 60));
  const ticks: number[] = [];

  for (let hour = begin; hour <= end; hour += stepHours) {
    ticks.push(hour);
  }

  return ticks;
}
