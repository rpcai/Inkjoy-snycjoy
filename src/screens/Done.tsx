import { Check } from "lucide-react";

export function Done(props: {
  addedCount: number;
  albumName: string;
  onDone: () => void;
  onAddMore: () => void;
}) {
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
