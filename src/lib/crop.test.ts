import { describe, expect, it } from "vitest";
import {
  clampPan,
  clampZoom,
  computeCropLayout,
  containSize,
  coverSize,
  effectivePhotoAspect,
  needsFraming,
  panLimits,
} from "./crop";

const PORTRAIT_FRAME = { w: 234, h: 312 }; // 3:4

describe("effectivePhotoAspect", () => {
  it("keeps aspect for 0/180 rotation", () => {
    expect(effectivePhotoAspect(1.5, 0)).toBe(1.5);
    expect(effectivePhotoAspect(1.5, 180)).toBe(1.5);
  });

  it("inverts aspect for 90/270 rotation", () => {
    expect(effectivePhotoAspect(1.5, 90)).toBeCloseTo(1 / 1.5);
    expect(effectivePhotoAspect(1.5, 270)).toBeCloseTo(1 / 1.5);
  });
});

describe("coverSize / containSize", () => {
  it("covers a portrait frame with a wide photo by matching height and overflowing width", () => {
    const size = coverSize(PORTRAIT_FRAME, 1.6);
    expect(size.h).toBe(PORTRAIT_FRAME.h);
    expect(size.w).toBeGreaterThan(PORTRAIT_FRAME.w);
  });

  it("contains a wide photo in a portrait frame by matching width and shrinking height", () => {
    const size = containSize(PORTRAIT_FRAME, 1.6);
    expect(size.w).toBe(PORTRAIT_FRAME.w);
    expect(size.h).toBeLessThan(PORTRAIT_FRAME.h);
  });

  it("cover and contain agree when the photo exactly matches the frame aspect", () => {
    const frameAspect = PORTRAIT_FRAME.w / PORTRAIT_FRAME.h;
    const cover = coverSize(PORTRAIT_FRAME, frameAspect);
    const contain = containSize(PORTRAIT_FRAME, frameAspect);
    expect(cover.w).toBeCloseTo(contain.w);
    expect(cover.h).toBeCloseTo(contain.h);
  });
});

describe("panLimits / clampPan", () => {
  it("has zero pan limit when the photo exactly fills the frame", () => {
    const limits = panLimits(PORTRAIT_FRAME, PORTRAIT_FRAME);
    expect(limits.x).toBe(0);
    expect(limits.y).toBe(0);
  });

  it("clamps pan within limits", () => {
    const limits = { x: 10, y: 5 };
    expect(clampPan({ x: 100, y: -100 }, limits)).toEqual({ x: 10, y: -5 });
    expect(clampPan({ x: 3, y: 2 }, limits)).toEqual({ x: 3, y: 2 });
  });
});

describe("clampZoom", () => {
  it("clamps to [100, 260] and rounds", () => {
    expect(clampZoom(50)).toBe(100);
    expect(clampZoom(999)).toBe(260);
    expect(clampZoom(150.6)).toBe(151);
  });
});

describe("computeCropLayout", () => {
  it("fill mode leaves no matte gap: size covers the frame on both axes", () => {
    const layout = computeCropLayout(PORTRAIT_FRAME, 1.6, { rot: 0, mode: "fill", zoom: 100, x: 0, y: 0 });
    expect(layout.size.w).toBeGreaterThanOrEqual(PORTRAIT_FRAME.w - 0.001);
    expect(layout.size.h).toBeGreaterThanOrEqual(PORTRAIT_FRAME.h - 0.001);
  });

  it("fit mode shows the whole photo: size fits within the frame on both axes", () => {
    const layout = computeCropLayout(PORTRAIT_FRAME, 1.6, { rot: 0, mode: "fit", zoom: 100, x: 0, y: 0 });
    expect(layout.size.w).toBeLessThanOrEqual(PORTRAIT_FRAME.w + 0.001);
    expect(layout.size.h).toBeLessThanOrEqual(PORTRAIT_FRAME.h + 0.001);
  });

  it("swaps drawSize back for 90/270 rotation so the rotated box matches the frame footprint", () => {
    const layout = computeCropLayout(PORTRAIT_FRAME, 1.6, { rot: 90, mode: "fill", zoom: 100, x: 0, y: 0 });
    expect(layout.drawSize.w).toBeCloseTo(layout.size.h);
    expect(layout.drawSize.h).toBeCloseTo(layout.size.w);
  });

  it("zoom scales fill size proportionally", () => {
    const base = computeCropLayout(PORTRAIT_FRAME, 1.6, { rot: 0, mode: "fill", zoom: 100, x: 0, y: 0 });
    const zoomed = computeCropLayout(PORTRAIT_FRAME, 1.6, { rot: 0, mode: "fill", zoom: 200, x: 0, y: 0 });
    expect(zoomed.size.w).toBeCloseTo(base.size.w * 2);
    expect(zoomed.size.h).toBeCloseTo(base.size.h * 2);
  });

  it("clamps requested pan to the computed limits", () => {
    const layout = computeCropLayout(PORTRAIT_FRAME, 1.6, { rot: 0, mode: "fill", zoom: 100, x: 99999, y: -99999 });
    expect(layout.pan.x).toBeCloseTo(layout.limits.x);
    expect(layout.pan.y).toBeCloseTo(-layout.limits.y);
  });
});

describe("needsFraming", () => {
  it("flags photos whose aspect differs from the frame by more than 0.02", () => {
    expect(needsFraming(1.6, 0.75)).toBe(true);
    expect(needsFraming(0.75, 0.75)).toBe(false);
    expect(needsFraming(0.76, 0.75)).toBe(false);
    expect(needsFraming(0.78, 0.75)).toBe(true);
  });
});
