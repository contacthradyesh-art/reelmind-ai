"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "@/lib/editor/transform";

export type EditableCanvasLayer = {
  id: string;
  text: string;
  fontSize: number;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  fontFamily?: string;
  color?: string;
};

export type PhotoTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type Props = {
  layers: EditableCanvasLayer[];
  activeLayerId: string;
  photoName?: string;
  photoSide?: "left" | "right";
  photoTransform?: PhotoTransform;
  onSelectLayer: (id: string) => void;
  onTransformLayer: (id: string, patch: Partial<EditableCanvasLayer>) => void;
  onTransformPhoto: (patch: PhotoTransform) => void;
  onSelectPhoto: () => void;
  onGestureStart?: () => void;
  canvasWidth: number;
  canvasHeight: number;
  disabled?: boolean;
};

/** Transparent interaction surface aligned to the responsive preview canvas. */
export default function InteractiveCanvasOverlay({
  layers,
  activeLayerId,
  photoName,
  photoSide = "right",
  photoTransform,
  onSelectLayer,
  onTransformLayer,
  onTransformPhoto,
  onSelectPhoto,
  onGestureStart,
  canvasWidth,
  canvasHeight,
  disabled = false,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{
    pointerId: number;
    kind: "move" | "scale" | "rotate";
    target: "layer" | "photo";
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originScale: number;
    originRotation: number;
    centerClientX: number;
    centerClientY: number;
    startAngle: number;
    startDistance: number;
  } | null>(null);
  const [gestureActive, setGestureActive] = useState(false);

  const startGesture = (
    event: ReactPointerEvent<HTMLElement>,
    target: "layer" | "photo",
    id: string,
    kind: "move" | "scale" | "rotate",
    values: { x: number; y: number; scale: number; rotation: number },
    select: () => void,
  ) => {
    if (disabled || !surfaceRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    select();
    onGestureStart?.();
    const rect = surfaceRef.current.getBoundingClientRect();
    const centerClientX = rect.left + (values.x / 100) * rect.width;
    const centerClientY = rect.top + (values.y / 100) * rect.height;
    gestureRef.current = {
      pointerId: event.pointerId,
      kind,
      target,
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: values.x,
      originY: values.y,
      originScale: values.scale,
      originRotation: values.rotation,
      centerClientX,
      centerClientY,
      startAngle: Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX) * 180 / Math.PI,
      startDistance: Math.max(1, Math.hypot(event.clientX - centerClientX, event.clientY - centerClientY)),
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setGestureActive(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    const surface = surfaceRef.current;
    if (!gesture || !surface || event.pointerId !== gesture.pointerId) return;
    event.preventDefault();
    const rect = surface.getBoundingClientRect();
    const dx = ((event.clientX - gesture.startX) / Math.max(rect.width, 1)) * 100;
    const dy = ((event.clientY - gesture.startY) / Math.max(rect.height, 1)) * 100;
    const patch = gesture.kind === "move"
      ? { x: clamp(gesture.originX + dx, 0, 100), y: clamp(gesture.originY + dy, 0, 100) }
      : gesture.kind === "scale"
        ? { scale: clamp(gesture.originScale * (Math.hypot(event.clientX - gesture.centerClientX, event.clientY - gesture.centerClientY) / gesture.startDistance), 0.2, 4) }
        : { rotation: gesture.originRotation + (Math.atan2(event.clientY - gesture.centerClientY, event.clientX - gesture.centerClientX) * 180 / Math.PI - gesture.startAngle) };
    if (gesture.target === "layer") onTransformLayer(gesture.id, patch);
    else onTransformPhoto({ ...(photoTransform ?? { x: gesture.originX, y: gesture.originY, scale: gesture.originScale, rotation: gesture.originRotation }), ...patch });
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setGestureActive(false);
  };

  const startLayerValues = (layer: EditableCanvasLayer) => ({
    x: layer.x, y: layer.y, scale: layer.scale ?? 1, rotation: layer.rotation ?? 0,
  });
  const photoValues: PhotoTransform = photoTransform ?? {
    x: photoSide === "left" ? 30 : 70, y: 50, scale: 1, rotation: 0,
  };

  return (
    <div
      ref={surfaceRef}
      className="absolute inset-0 z-20 touch-none select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
      aria-label="Interactive canvas controls"
    >
      {photoName && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Select photo layer"
          onPointerDown={(event) => startGesture(event, "photo", "photo", "move", photoValues, onSelectPhoto)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectPhoto(); } }}
          className={`absolute border-2 border-dashed ${gestureActive ? "border-fuchsia-300" : "border-white/70"} cursor-move`}
          style={{
            left: `${photoValues.x}%`, top: `${photoValues.y}%`,
            width: "54%", height: "72%",
            transform: `translate(-50%, -50%) scale(${photoValues.scale}) rotate(${photoValues.rotation}deg)`,
            transformOrigin: "center",
            pointerEvents: disabled ? "none" : "auto",
            borderColor: activeLayerId === "__photo__" ? "#e879f9" : undefined,
          }}
        >
          <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">PHOTO</span>
          {activeLayerId === "__photo__" && !disabled && (
            <>
              <button type="button" aria-label="Rotate photo" className="absolute left-1/2 top-0 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-fuchsia-500 text-xs" onPointerDown={(event) => startGesture(event, "photo", "photo", "rotate", photoValues, onSelectPhoto)}>↻</button>
              <button type="button" aria-label="Resize photo" className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-fuchsia-500" onPointerDown={(event) => startGesture(event, "photo", "photo", "scale", photoValues, onSelectPhoto)} />
            </>
          )}
        </div>
      )}
      {layers.map((layer) => {
        const values = startLayerValues(layer);
        const isActive = activeLayerId === layer.id;
        const longestLine = Math.max(...layer.text.split("\n").map((line) => line.length), 1);
        const boxWidth = clamp((longestLine * layer.fontSize * 0.62 * (layer.scale ?? 1) / 1080) * 100, 12, 88);
        const boxHeight = clamp((layer.fontSize * (canvasWidth / 1080) * Math.max(1, layer.text.split("\n").length) * 1.2 * (layer.scale ?? 1) / canvasHeight) * 100, 5, 42);
        return (
          <div
            key={layer.id}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Select and move ${layer.text || "text layer"}`}
            onPointerDown={(event) => startGesture(event, "layer", layer.id, "move", values, () => onSelectLayer(layer.id))}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectLayer(layer.id); } }}
            className={`absolute cursor-move border-2 ${isActive ? "border-fuchsia-300" : "border-transparent hover:border-white/60"}`}
            style={{
              left: `${layer.x}%`, top: `${layer.y}%`,
              width: `${boxWidth}%`, minHeight: `${boxHeight}%`,
              transform: `translate(-50%, -50%) rotate(${layer.rotation ?? 0}deg) scale(${layer.scale ?? 1})`,
              transformOrigin: "center",
              pointerEvents: disabled ? "none" : "auto",
              borderRadius: 4,
            }}
          >
            {isActive && !disabled && (
              <>
                <button type="button" aria-label="Rotate selected layer" className="absolute left-1/2 top-0 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-fuchsia-500 text-xs" onPointerDown={(event) => startGesture(event, "layer", layer.id, "rotate", values, () => onSelectLayer(layer.id))}>↻</button>
                <button type="button" aria-label="Scale selected layer" className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-fuchsia-500" onPointerDown={(event) => startGesture(event, "layer", layer.id, "scale", values, () => onSelectLayer(layer.id))} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
