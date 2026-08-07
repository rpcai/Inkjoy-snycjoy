import type React from "react";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Album, Carousel } from "../types";

export function SlideshowEditorSheet(props: {
  albums: Album[];
  selectedAlbumId: string;
  onSelectAlbum: (albumId: string) => void;
  activeCarousel?: Carousel;
  onActivate: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-overlay" role="presentation" onMouseDown={props.onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideshow-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="sheet-handle" />
        <div className="sheet-header-row">
          <div>
            <h2 id="slideshow-settings-title">Edit Slideshow</h2>
            <p className="sheet-subtitle">Choose the album and refresh schedule for this frame.</p>
          </div>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <SlideshowSettingsForm
          albums={props.albums}
          selectedAlbumId={props.selectedAlbumId}
          onSelectAlbum={props.onSelectAlbum}
          activeCarousel={props.activeCarousel}
          onActivate={props.onActivate}
          onCancel={props.onClose}
        />
      </section>
    </div>
  );
}

function SlideshowSettingsForm(props: {
  albums: Album[];
  selectedAlbumId: string;
  onSelectAlbum: (albumId: string) => void;
  activeCarousel?: Carousel;
  onActivate: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const carousel = props.activeCarousel;
  const [updateType, setUpdateType] = useState<"INTERVAL" | "FIXED">(carousel?.updateType || "INTERVAL");
  const [allDay, setAllDay] = useState(() =>
    Boolean(carousel && carousel.beginTime === "00:00" && (carousel.endTime === "23:59" || carousel.endTime === "24:00")),
  );
  const [beginTime, setBeginTime] = useState(carousel?.beginTime && carousel.beginTime !== "00:00" ? carousel.beginTime : "09:00");
  const [endTime, setEndTime] = useState(
    carousel?.endTime && carousel.endTime !== "23:59" && carousel.endTime !== "24:00" ? carousel.endTime : "18:00",
  );
  const [switchTimes, setSwitchTimes] = useState<string[]>(
    carousel?.updateTimeList?.length ? carousel.updateTimeList : ["08:00", "20:00"],
  );

  function updateSwitchTime(index: number, value: string) {
    setSwitchTimes((current) => current.map((time, itemIndex) => (itemIndex === index ? value : time)));
  }

  function addSwitchTime() {
    setSwitchTimes((current) => [...current, "12:00"]);
  }

  function removeSwitchTime(index: number) {
    setSwitchTimes((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current));
  }

  return (
    <form className="strategy-form modal-strategy-form" onSubmit={props.onActivate}>
      <label>
        Album
        <select value={props.selectedAlbumId} onChange={(event) => props.onSelectAlbum(event.target.value)}>
          {props.albums.map((album) => (
            <option key={album.albumId} value={album.albumId}>
              {album.albumName || "Untitled"}
            </option>
          ))}
        </select>
      </label>

      <label>
        Trigger
        <select
          name="updateType"
          value={updateType}
          onChange={(event) => setUpdateType(event.target.value as "INTERVAL" | "FIXED")}
        >
          <option value="INTERVAL">Interval</option>
          <option value="FIXED">Fixed Schedule</option>
        </select>
      </label>

      {updateType === "INTERVAL" ? (
        <>
          <div className="form-radio-row" role="radiogroup" aria-label="Active hours">
            <label className="radio-option">
              <input type="radio" checked={allDay} onChange={() => setAllDay(true)} />
              All day
            </label>
            <label className="radio-option">
              <input type="radio" checked={!allDay} onChange={() => setAllDay(false)} />
              Specific hours
            </label>
          </div>

          <input type="hidden" name="beginTime" value={allDay ? "00:00" : beginTime} />
          <input type="hidden" name="endTime" value={allDay ? "23:59" : endTime} />

          <label>
            Start
            <input type="time" value={beginTime} disabled={allDay} onChange={(event) => setBeginTime(event.target.value)} />
          </label>
          <label>
            End
            <input type="time" value={endTime} disabled={allDay} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label>
            Every (min)
            <input name="intervalMinutes" type="number" min="5" defaultValue={carousel?.intervalMinutes ?? 120} />
          </label>
          <label>
            Repeat every (days)
            <input name="updateDays" type="number" min="1" defaultValue={carousel?.updateDays ?? 1} />
          </label>
        </>
      ) : (
        <>
          <p className="form-hint">The image updates at a fixed time, every N days.</p>
          <label>
            Interval (days)
            <input name="updateDays" type="number" min="1" defaultValue={carousel?.updateDays ?? 1} />
          </label>
          <div className="switch-times-field">
            <span className="switch-times-label">Switching times</span>
            {switchTimes.map((time, index) => (
              <div className="switch-time-row" key={index}>
                <input
                  name="updateTimeList"
                  type="time"
                  value={time}
                  onChange={(event) => updateSwitchTime(index, event.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeSwitchTime(index)}
                  disabled={switchTimes.length <= 1}
                  aria-label="Remove switching time"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm switch-time-add" onClick={addSwitchTime}>
              <Plus size={14} />
              Add time
            </button>
          </div>
        </>
      )}

      <label>
        Play Order
        <select name="playOrder" defaultValue={carousel?.playOrder ?? "SEQUENTIALLY"}>
          <option value="SEQUENTIALLY">Sequential</option>
          <option value="SHUFFLE">Shuffle</option>
        </select>
      </label>
      <label>
        After display
        <select name="idle" defaultValue={String(carousel?.idle ?? 1)}>
          <option value="1">Stay on</option>
          <option value="0">Sleep</option>
        </select>
      </label>
      <label className="checkbox-row">
        <input name="playNow" type="checkbox" defaultChecked={carousel?.playNow ?? true} />
        Push immediately
      </label>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          <Plus size={15} />
          Save Slideshow
        </button>
      </div>
    </form>
  );
}
