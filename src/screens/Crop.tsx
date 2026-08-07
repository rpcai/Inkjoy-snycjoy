import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, RotateCw, Search } from "lucide-react";
import { clampPan, clampZoom, computeCropLayout, containSize, cropStageFrame, panLimits, type Size } from "../lib/crop";
import type { CropAdjustment, LocalPickedPhoto, Matte } from "../types";

const MATTE_SWATCHES: { value: Matte; label: string }[] = [
  { value: "blur", label: "Blurred photo" },
  { value: "#FFFFFF", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#A02020", label: "Red" },
  { value: "#F0E050", label: "Yellow" },
  { value: "#608050", label: "Green" },
  { value: "#5080B8", label: "Blue" },
];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function Crop(props: {
  photos: LocalPickedPhoto[];
  crops: Record<string, CropAdjustment>;
  index: number;
  panelSize: Size;
  frameLabel: string;
  onChangeIndex: (index: number) => void;
  onUpdateCrop: (id: string, patch: Partial<CropAdjustment>) => void;
  onResetCrop: (id: string) => void;
  onApplyToAll: () => void;
  onBack: () => void;
  onFinish: () => void;
  onStageFrameChange: (frame: Size) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureDist = useRef(0);
  const gestureZoom = useRef(100);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [stageFrame, setStageFrame] = useState<Size>(() => cropStageFrame(props.panelSize));

  const panelAspect = props.panelSize.w / props.panelSize.h;

  useLayoutEffect(() => {
    function measure() {
      const el = stageWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) return;
      const next = containSize({ w: rect.width, h: rect.height }, panelAspect);
      setStageFrame(next);
      props.onStageFrameChange(next);
    }

    measure();
    const element = stageWrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelAspect]);

  const photo = props.photos[props.index];
  const crop = photo ? props.crops[photo.id] : undefined;

  if (!photo || !crop) {
    return null;
  }

  const photoAspect = photo.width / photo.height;
  const layout = computeCropLayout(stageFrame, photoAspect, crop);
  const isLast = props.index === props.photos.length - 1;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setDragging(true);

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      gestureDist.current = distance(pts[0], pts[1]);
      gestureZoom.current = crop.zoom;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!photo || !crop || !pointers.current.has(event.pointerId)) return;
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2) {
      const pts = Array.from(pointers.current.values());
      const dist = distance(pts[0], pts[1]);
      if (gestureDist.current > 0) {
        const nextZoom = clampZoom(gestureZoom.current * (dist / gestureDist.current));
        const nextLayout = computeCropLayout(stageFrame, photoAspect, { ...crop, zoom: nextZoom });
        props.onUpdateCrop(photo.id, { zoom: nextZoom, x: nextLayout.pan.x, y: nextLayout.pan.y, done: true });
      }
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    const limits = panLimits(stageFrame, layout.size);
    const nextPan = clampPan({ x: crop.x + dx, y: crop.y + dy }, limits);
    props.onUpdateCrop(photo.id, { x: nextPan.x, y: nextPan.y, done: true });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      gestureDist.current = 0;
    }
    if (pointers.current.size === 0) {
      setDragging(false);
    }
  }

  function setMode(mode: CropAdjustment["mode"]) {
    if (!photo) return;
    props.onUpdateCrop(photo.id, { mode, zoom: 100, x: 0, y: 0, done: true });
  }

  function rotate() {
    if (!photo || !crop) return;
    const next = ((crop.rot + 90) % 360) as CropAdjustment["rot"];
    props.onUpdateCrop(photo.id, { rot: next, x: 0, y: 0, done: true });
  }

  function setZoom(zoom: number) {
    if (!photo || !crop) return;
    const clamped = clampZoom(zoom);
    const nextLayout = computeCropLayout(stageFrame, photoAspect, { ...crop, zoom: clamped });
    props.onUpdateCrop(photo.id, { zoom: clamped, x: nextLayout.pan.x, y: nextLayout.pan.y, done: true });
  }

  return (
    <div className="crop-screen">
      <div className="crop-app-bar">
        <button type="button" className="icon-btn-ghost dark" onClick={props.onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="crop-app-bar-title">
          <strong>Frame for {props.frameLabel}</strong>
          <span>
            {props.index + 1} of {props.photos.length} · {photo.width} × {photo.height}
          </span>
        </div>
        <button type="button" className="crop-reset-btn" onClick={() => props.onResetCrop(photo.id)}>
          Reset
        </button>
      </div>

      <div className="crop-stage-wrap" ref={stageWrapRef}>
        <div
          className="crop-stage"
          style={{ width: stageFrame.w, height: stageFrame.h }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {crop.mode === "fit" && crop.matte !== "blur" ? (
            <div className="crop-matte-fill" style={{ background: crop.matte }} />
          ) : null}
          {crop.mode === "fit" && crop.matte === "blur" ? (
            <img className="crop-matte-blur" src={photo.previewUrl} alt="" />
          ) : null}
          <div
            className="crop-stage-photo"
            style={{
              width: layout.drawSize.w,
              height: layout.drawSize.h,
              transform: `translate(calc(-50% + ${layout.pan.x}px), calc(-50% + ${layout.pan.y}px)) rotate(${crop.rot}deg)`,
            }}
          >
            <img src={photo.previewUrl} alt="" draggable={false} />
          </div>
          {dragging ? (
            <div className="crop-grid" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          ) : null}
          {crop.rot !== 0 ? <span className="crop-rotation-badge">{crop.rot}°</span> : null}
        </div>
      </div>

      <p className="crop-hint">
        {crop.mode === "fill" ? "Drag to reposition · pinch or slide to zoom" : "Whole photo shown with a printed border"}
      </p>

      <div className="crop-mode-row">
        <div className="segmented">
          <button
            type="button"
            className={`segmented-option ${crop.mode === "fill" ? "active" : ""}`}
            onClick={() => setMode("fill")}
          >
            Fill frame
          </button>
          <button
            type="button"
            className={`segmented-option ${crop.mode === "fit" ? "active" : ""}`}
            onClick={() => setMode("fit")}
          >
            Fit whole photo
          </button>
        </div>
        <button type="button" className="crop-rotate-btn" onClick={rotate} aria-label="Rotate">
          <RotateCw size={18} />
        </button>
      </div>

      {crop.mode === "fit" ? (
        <div className="crop-matte-row">
          <div className="crop-matte-swatches">
            {MATTE_SWATCHES.map((swatch) => (
              <button
                type="button"
                key={swatch.value}
                className={`matte-swatch ${crop.matte === swatch.value ? "active" : ""} ${swatch.value === "blur" ? "blur" : ""}`}
                style={swatch.value === "blur" ? undefined : { background: swatch.value }}
                onClick={() => props.onUpdateCrop(photo.id, { matte: swatch.value, done: true })}
                aria-label={swatch.label}
              >
                {swatch.value === "blur" ? <img src={photo.previewUrl} alt="" /> : null}
              </button>
            ))}
          </div>
          <div className="crop-matte-caption">
            <span>{MATTE_SWATCHES.find((swatch) => swatch.value === crop.matte)?.label}</span>
            <span>Spectra 6 inks · no dithering</span>
          </div>
        </div>
      ) : (
        <div className="crop-zoom-row">
          <Search size={16} />
          <input
            type="range"
            min={100}
            max={260}
            step={2}
            value={crop.zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <span className="crop-zoom-value">{crop.zoom}%</span>
        </div>
      )}

      <div className="crop-filmstrip">
        {props.photos.map((item, itemIndex) => {
          const itemCrop = props.crops[item.id];
          const itemAspect = item.width / item.height;
          const panelAspect = props.panelSize.w / props.panelSize.h;
          const unresolved = itemCrop && !itemCrop.done && Math.abs(itemAspect - panelAspect) > 0.02;
          return (
            <button
              type="button"
              key={item.id}
              className={`crop-filmstrip-thumb ${itemIndex === props.index ? "current" : ""}`}
              onClick={() => props.onChangeIndex(itemIndex)}
            >
              <img src={item.previewUrl} alt="" />
              {unresolved ? <span className="crop-filmstrip-dot" /> : null}
            </button>
          );
        })}
      </div>

      <div className="crop-footer">
        <button type="button" className="btn btn-ghost-dark" onClick={props.onApplyToAll}>
          Apply to all
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={() => (isLast ? props.onFinish() : props.onChangeIndex(props.index + 1))}
        >
          {isLast ? "Done" : "Next photo"}
        </button>
      </div>
    </div>
  );
}
