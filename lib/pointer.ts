/** True on touch-first devices, where autofocus would open the keyboard uninvited. */
export function coarsePointer() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}
