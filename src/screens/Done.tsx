import { Check, TriangleAlert } from "lucide-react";

export function Done(props: {
  addedCount: number;
  albumName: string;
  error?: string;
  onDone: () => void;
  onAddMore: () => void;
}) {
  const failed = props.addedCount === 0 && Boolean(props.error);

  if (failed) {
    return (
      <div className="done-screen">
        <div className="done-check-circle done-check-circle-error">
          <TriangleAlert size={30} />
        </div>
        <h2>Couldn't add photos</h2>
        <p>{props.error}</p>
        <div className="done-actions">
          <button type="button" className="btn btn-primary" onClick={props.onAddMore}>
            Try again
          </button>
          <button type="button" className="btn btn-secondary" onClick={props.onDone}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="done-screen">
      <div className="done-check-circle">
        <Check size={30} />
      </div>
      <h2>
        {props.addedCount} photo{props.addedCount === 1 ? "" : "s"} added
      </h2>
      <p>Saved to {props.albumName}.</p>
      <div className="done-actions">
        <button type="button" className="btn btn-primary" onClick={props.onDone}>
          Done
        </button>
        <button type="button" className="btn btn-secondary" onClick={props.onAddMore}>
          Add more photos
        </button>
      </div>
    </div>
  );
}
