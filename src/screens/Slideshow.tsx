import type React from "react";
import { Plus, X } from "lucide-react";
import type { Album } from "../types";

export function SlideshowEditorSheet(props: {
  albums: Album[];
  selectedAlbumId: string;
  onSelectAlbum: (albumId: string) => void;
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
  onActivate: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
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
        <select name="updateType" defaultValue="INTERVAL">
          <option value="INTERVAL">Interval</option>
          <option value="FIXED">Fixed Schedule</option>
        </select>
      </label>
      <label>
        Start
        <input name="beginTime" type="time" defaultValue="09:00" />
      </label>
      <label>
        End
        <input name="endTime" type="time" defaultValue="18:00" />
      </label>
      <label>
        Every (min)
        <input name="intervalMinutes" type="number" min="5" defaultValue="120" />
      </label>
      <label>
        Repeat every (days)
        <input name="updateDays" type="number" min="1" defaultValue="1" />
      </label>
      <label>
        Push at
        <input name="updateTimeList" defaultValue="09:00,18:00" />
      </label>
      <label>
        Play Order
        <select name="playOrder" defaultValue="SEQUENTIALLY">
          <option value="SEQUENTIALLY">Sequential</option>
          <option value="SHUFFLE">Shuffle</option>
        </select>
      </label>
      <label>
        After display
        <select name="idle" defaultValue="1">
          <option value="1">Stay on</option>
          <option value="0">Sleep</option>
        </select>
      </label>
      <label className="checkbox-row">
        <input name="playNow" type="checkbox" defaultChecked />
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
