import type { CropAdjustment } from "../types";

export type Size = { w: number; h: number };
export type Point = { x: number; y: number };

export const ZOOM_MIN = 100;
export const ZOOM_MAX = 260;

export function effectivePhotoAspect(photoAspect: number, rotation: 0 | 90 | 180 | 270): number {
  return rotation === 90 || rotation === 270 ? 1 / photoAspect : photoAspect;
}

export function coverSize(frame: Size, aspect: number): Size {
  const frameAspect = frame.w / frame.h;
  return aspect > frameAspect ? { h: frame.h, w: frame.h * aspect } : { w: frame.w, h: frame.w / aspect };
}

export function containSize(frame: Size, aspect: number): Size {
  const frameAspect = frame.w / frame.h;
  return aspect > frameAspect ? { w: frame.w, h: frame.w / aspect } : { h: frame.h, w: frame.h * aspect };
}

export function baseSize(frame: Size, aspect: number, mode: CropAdjustment["mode"]): Size {
  return mode === "fill" ? coverSize(frame, aspect) : containSize(frame, aspect);
}

export function scaledSize(base: Size, mode: CropAdjustment["mode"], zoom: number): Size {
  if (mode !== "fill") return base;
  const factor = zoom / 100;
  return { w: base.w * factor, h: base.h * factor };
}

export function panLimits(frame: Size, size: Size): Point {
  return {
    x: Math.max(0, (size.w - frame.w) / 2),
    y: Math.max(0, (size.h - frame.h) / 2),
  };
}

export function clampPan(pan: Point, limits: Point): Point {
  return {
    x: Math.min(limits.x, Math.max(-limits.x, pan.x)),
    y: Math.min(limits.y, Math.max(-limits.y, pan.y)),
  };
}

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom)));
}

export type CropLayout = {
  /** Final on-screen footprint of the (possibly rotated) photo, centred in the frame before panning. */
  size: Size;
  /** Box to actually draw the un-rotated source image into, before the rotate transform is applied. */
  drawSize: Size;
  limits: Point;
  pan: Point;
};

export function computeCropLayout(
  frame: Size,
  photoAspect: number,
  crop: Pick<CropAdjustment, "rot" | "mode" | "zoom" | "x" | "y">,
): CropLayout {
  const aspect = effectivePhotoAspect(photoAspect, crop.rot);
  const base = baseSize(frame, aspect, crop.mode);
  const size = scaledSize(base, crop.mode, crop.zoom);
  const limits = panLimits(frame, size);
  const pan = clampPan({ x: crop.x, y: crop.y }, limits);
  const rotated = crop.rot === 90 || crop.rot === 270;
  const drawSize = rotated ? { w: size.h, h: size.w } : size;
  return { size, drawSize, limits, pan };
}

export const STAGE_BOX: Size = { w: 260, h: 260 };

export function cropStageFrame(panelSize: Size): Size {
  return containSize(STAGE_BOX, panelSize.w / panelSize.h);
}

export function defaultCropAdjustment(): CropAdjustment {
  return { zoom: 100, x: 0, y: 0, rot: 0, mode: "fill", matte: "blur", done: false };
}

export function needsFraming(photoAspect: number, frameAspect: number): boolean {
  return Math.abs(photoAspect - frameAspect) > 0.02;
}
