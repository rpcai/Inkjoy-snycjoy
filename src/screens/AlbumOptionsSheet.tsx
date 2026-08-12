import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { Album } from "../types";

export function AlbumOptionsSheet(props: {
  album: Album;
  onRename: (albumName: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "rename" | "delete">("menu");
  const [name, setName] = useState(props.album.albumName || "");
  const trimmedName = name.trim();

  return (
    <div className="sheet-overlay" role="presentation" onMouseDown={props.onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="album-options-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="sheet-handle" />
        <div className="sheet-header-row">
          <h2 id="album-options-title">
            {mode === "rename" ? "Rename album" : mode === "delete" ? "Delete album" : "Album options"}
          </h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {mode === "menu" ? (
          <div className="sheet-rows">
            <button type="button" className="sheet-row" onClick={() => setMode("rename")}>
              <span className="sheet-row-icon">
                <Pencil size={16} />
              </span>
              <span className="sheet-row-copy">
                <strong>Rename album</strong>
              </span>
            </button>
            <button type="button" className="sheet-row" onClick={() => setMode("delete")}>
              <span className="sheet-row-icon">
                <Trash2 size={16} />
              </span>
              <span className="sheet-row-copy">
                <strong>Delete album</strong>
              </span>
            </button>
          </div>
        ) : null}

        {mode === "rename" ? (
          <form
            className="sheet-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!trimmedName || trimmedName === props.album.albumName) {
                props.onClose();
                return;
              }
              props.onRename(trimmedName);
            }}
          >
            <label>
              Album name
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMode("menu")}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={!trimmedName}>
                Save
              </button>
            </div>
          </form>
        ) : null}

        {mode === "delete" ? (
          <div className="sheet-form">
            <p className="form-hint">
              This permanently deletes “{props.album.albumName || "this album"}” and all{" "}
              {props.album.imgCount || 0} photo{props.album.imgCount === 1 ? "" : "s"} in it from Inkjoy. This
              can't be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMode("menu")}>
                Back
              </button>
              <button type="button" className="btn btn-danger" onClick={props.onDelete}>
                Delete album
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
