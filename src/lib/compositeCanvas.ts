import { computeCropLayout, type Size } from "./crop";
import type { CropAdjustment } from "../types";

const BLUR_MATTE_PX = 22;
const BLUR_OVERSCAN = 1.18;

export async function loadImageBitmap(source: File | Blob | string): Promise<ImageBitmap> {
  if (typeof source === "string") {
    const response = await fetch(source);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }
  return createImageBitmap(source);
}

export async function compositeCrop(
  image: ImageBitmap,
  panelSize: Size,
  stageFrame: Size,
  crop: CropAdjustment,
): Promise<Blob> {
  const photoAspect = image.width / image.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(panelSize.w);
  canvas.height = Math.round(panelSize.h);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D is not supported");
  }

  if (crop.matte === "blur") {
    drawBlurredMatte(ctx, image, panelSize);
  } else {
    ctx.fillStyle = crop.matte;
    ctx.fillRect(0, 0, panelSize.w, panelSize.h);
  }

  // Stored pan is in on-screen "stage px"; scale it to the panel's native resolution.
  const scale = panelSize.w / stageFrame.w;
  const scaledCrop: CropAdjustment = { ...crop, x: crop.x * scale, y: crop.y * scale };
  const layout = computeCropLayout(panelSize, photoAspect, scaledCrop);

  ctx.save();
  ctx.translate(panelSize.w / 2 + layout.pan.x, panelSize.h / 2 + layout.pan.y);
  ctx.rotate((crop.rot * Math.PI) / 180);
  ctx.drawImage(image, -layout.drawSize.w / 2, -layout.drawSize.h / 2, layout.drawSize.w, layout.drawSize.h);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode composited image"))),
      "image/jpeg",
      0.92,
    );
  });
}

function drawBlurredMatte(ctx: CanvasRenderingContext2D, image: ImageBitmap, panelSize: Size) {
  const overscanW = panelSize.w * BLUR_OVERSCAN;
  const overscanH = panelSize.h * BLUR_OVERSCAN;
  const cover = coverFill(overscanW, overscanH, image.width / image.height);

  ctx.save();
  ctx.filter = `blur(${BLUR_MATTE_PX}px) saturate(0.75) brightness(0.82)`;
  ctx.drawImage(
    image,
    panelSize.w / 2 - cover.w / 2,
    panelSize.h / 2 - cover.h / 2,
    cover.w,
    cover.h,
  );
  ctx.restore();
}

function coverFill(boxW: number, boxH: number, aspect: number): Size {
  const boxAspect = boxW / boxH;
  return aspect > boxAspect ? { h: boxH, w: boxH * aspect } : { w: boxW, h: boxW / aspect };
}
