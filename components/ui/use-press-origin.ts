"use client";
import { useEffect, useRef } from "react";

/**
 * Tracks whether the most recent pointer press began inside the element the
 * returned ref is attached to. A text selection that starts inside a panel
 * and ends over the backdrop fires a "click outside"; that must not dismiss.
 */
export function usePressOrigin<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const pressedInside = useRef(false);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      pressedInside.current =
        event.target instanceof Node &&
        ref.current?.contains(event.target) === true;
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);
  return { ref, pressedInside };
}
