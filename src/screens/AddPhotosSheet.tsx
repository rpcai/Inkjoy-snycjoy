import { Image as ImageIcon, Images, UploadCloud } from "lucide-react";

export function AddPhotosSheet(props: {
  isMobile: boolean;
  onPickLocal: () => void;
  onGooglePhotos: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-overlay" role="presentation" onMouseDown={props.onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-photos-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="sheet-handle" />
        <h2 id="add-photos-title">Add photos</h2>
        <p className="sheet-subtitle">Choose where to pick photos from.</p>

        <div className="sheet-rows">
          {props.isMobile ? (
            <button type="button" className="sheet-row highlighted" onClick={props.onPickLocal}>
              <span className="sheet-row-icon primary">
                <Images size={18} />
              </span>
              <span className="sheet-row-copy">
                <strong>Phone collections</strong>
                <span>Camera, Screenshots, Google Photos</span>
              </span>
            </button>
          ) : (
            <button type="button" className="sheet-row highlighted" onClick={props.onPickLocal}>
              <span className="sheet-row-icon primary">
                <UploadCloud size={18} />
              </span>
              <span className="sheet-row-copy">
                <strong>Files</strong>
                <span>Downloads, Drive, SD card</span>
              </span>
            </button>
          )}

          <button
            type="button"
            className={`sheet-row ${props.isMobile ? "disabled" : ""}`}
            onClick={props.isMobile ? undefined : props.onGooglePhotos}
            disabled={props.isMobile}
          >
            <span className="sheet-row-icon">
              <ImageIcon size={18} />
            </span>
            <span className="sheet-row-copy">
              <strong>Google Photos Picker</strong>
              <span>
                {props.isMobile
                  ? "Desktop only — the phone reads Google Photos directly"
                  : "Pick from your Google Photos library"}
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
