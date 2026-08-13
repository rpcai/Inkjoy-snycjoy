import { useEffect, useState } from "react";
import { api } from "./api";

/** CSS rotation (degrees) needed to correct an Inkjoy thumbnail whose EXIF orientation was
 * stripped during generation. Looked up lazily from the full-size original's EXIF data. */
export function useImageRotation(originUrl?: string): number {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setRotation(0);
    if (!originUrl) return;
    let cancelled = false;
    api
      .imageOrientation(originUrl)
      .then((result) => {
        if (!cancelled) setRotation(result.rotation || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [originUrl]);

  return rotation;
}
