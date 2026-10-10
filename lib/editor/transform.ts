export type Point = { x: number; y: number };
export type Transform = Point & { scale: number; rotation: number };

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function clientToNormalized(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): Point {
  return {
    x: clamp(((clientX - rect.left) / Math.max(rect.width, 1)) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / Math.max(rect.height, 1)) * 100, 0, 100),
  };
}

export function normalizedDelta(
  deltaX: number,
  deltaY: number,
  rect: Pick<DOMRect, "width" | "height">,
): Point {
  return {
    x: (deltaX / Math.max(rect.width, 1)) * 100,
    y: (deltaY / Math.max(rect.height, 1)) * 100,
  };
}

export function angleFromCenter(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
): number {
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 90;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointerDistanceFromCenter(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
): number {
  return Math.hypot(clientX - centerX, clientY - centerY);
}
