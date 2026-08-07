import { Plus } from "lucide-react";

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label="Add photos">
      <Plus size={26} />
    </button>
  );
}
