import { Image, UploadCloud, X } from "lucide-react";
import { api } from "../lib/api";
import type { PickedMediaItem, PickerSession } from "../types";

export function PickerSessionModal(props: {
  session: PickerSession;
  items: PickedMediaItem[];
  targetAlbumName?: string;
  onOpenPicker: () => void;
  onImport: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={props.onClose}>
      <section
        className="modal-box picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-session-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="picker-session-title">Google Photos Picker</h2>
            <p className="section-subtitle">
              Google opens the picker in its own window; return here after tapping Done.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="picker-modal-actions">
          <button type="button" className="btn btn-primary" onClick={props.onOpenPicker}>
            <UploadCloud size={16} />
            Open Google Photos
          </button>
        </div>

        <div className="picker-status">
          <span>{props.session.mediaItemsSet ? "Selection received." : "Waiting for selection."}</span>
          <span>{props.items.length} image{props.items.length === 1 ? "" : "s"} ready for import.</span>
        </div>

        <PickedImagePreview items={props.items} />

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={props.onClose}>
            Close
          </button>
          <button type="button" className="btn btn-success" onClick={props.onImport} disabled={!props.items.length}>
            Add to {props.targetAlbumName || "Album"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PickedImagePreview({ items }: { items: PickedMediaItem[] }) {
  if (!items.length) {
    return <div className="empty-state compact">No images selected yet.</div>;
  }

  return (
    <div className="picked-preview-grid">
      {items.map((item) => (
        <div className="picked-preview-card" key={item.id}>
          {item.mediaFile?.baseUrl ? (
            <img src={api.googleThumbnailUrl(item.mediaFile.baseUrl)} alt="" />
          ) : (
            <Image size={24} />
          )}
          <span>{item.mediaFile?.filename || "Google Photo"}</span>
        </div>
      ))}
    </div>
  );
}
