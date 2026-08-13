/**
 * Minimal JPEG EXIF orientation reader. Only reads the Orientation tag (0x0112) from IFD0 —
 * enough to know how many degrees to rotate the image for correct display. Callers only need to
 * pass the first ~128KB of a JPEG (the EXIF APP1 segment, if present, always comes right after
 * the SOI marker, well before the compressed image data).
 */
export function readJpegOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda || marker === 0xd8 || marker === 0xd9) break; // start of scan / no-length markers
    const segmentLength = view.getUint16(offset + 2);
    if (marker === 0xe1) {
      const orientation = readExifOrientation(view, offset + 4, segmentLength - 2);
      if (orientation) return orientation;
    }
    offset += 2 + segmentLength;
  }
  return 1;
}

function readExifOrientation(view: DataView, start: number, length: number): number | null {
  if (length < 8) return null;
  if (
    view.getUint8(start) !== 0x45 || // E
    view.getUint8(start + 1) !== 0x78 || // x
    view.getUint8(start + 2) !== 0x69 || // i
    view.getUint8(start + 3) !== 0x66 // f
  ) {
    return null;
  }

  const tiffStart = start + 6;
  const byteOrder = view.getUint16(tiffStart);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return null;

  const ifd0Offset = view.getUint32(tiffStart + 4, little);
  const ifd0Start = tiffStart + ifd0Offset;
  if (ifd0Start + 2 > view.byteLength) return null;

  const entryCount = view.getUint16(ifd0Start, little);
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifd0Start + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;
    const tag = view.getUint16(entryOffset, little);
    if (tag === 0x0112) {
      return view.getUint16(entryOffset + 8, little);
    }
  }
  return null;
}

/** Degrees to rotate clockwise for correct display. Mirrored orientations (2/4/5/7) are rare for
 * camera photos; only the rotation component is applied for those. */
export function orientationToRotation(orientation: number): 0 | 90 | 180 | 270 {
  switch (orientation) {
    case 3:
    case 4:
      return 180;
    case 5:
    case 6:
      return 90;
    case 7:
    case 8:
      return 270;
    default:
      return 0;
  }
}
