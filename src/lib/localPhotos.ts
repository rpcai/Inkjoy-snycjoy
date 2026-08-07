import type { LocalPickedPhoto } from "../types";

// Modern browsers already normalize EXIF orientation for <img> decoding and
// createImageBitmap(), so no manual EXIF parsing is needed here.
let counter = 0;

export function pickLocalPhotos(): Promise<LocalPickedPhoto[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png";
    input.multiple = true;
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.left = "-1000px";

    input.addEventListener(
      "change",
      async () => {
        const files = Array.from(input.files || []);
        input.remove();
        const sources = await Promise.all(files.map(toPickedSource));
        resolve(sources.filter((source): source is LocalPickedPhoto => source !== null));
      },
      { once: true },
    );

    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => {
          if (!input.files || !input.files.length) {
            input.remove();
            resolve([]);
          }
        }, 800);
      },
      { once: true },
    );

    document.body.append(input);
    input.click();
  });
}

async function toPickedSource(file: File): Promise<LocalPickedPhoto | null> {
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return null;
  }

  const previewUrl = URL.createObjectURL(file);

  try {
    const { width, height } = await readImageDimensions(previewUrl);
    return {
      id: `local-${Date.now()}-${counter++}`,
      file,
      previewUrl,
      width,
      height,
    };
  } catch {
    URL.revokeObjectURL(previewUrl);
    return null;
  }
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to read image"));
    img.src = url;
  });
}
