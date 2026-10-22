import type { ReactElement } from "react";
// The edge build skips the browser build's load-time MessageChannel, which
// Convex's default runtime does not provide.
import { renderToStaticMarkup } from "react-dom/server.edge";

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

/**
 * Synchronous counterpart to React Email's `render` for Convex functions,
 * including Convex Auth's non-Node runtime. React escapes every string, so
 * customer content never becomes markup.
 */
export function renderEmailHtml(email: ReactElement) {
  return `${DOCTYPE}${renderToStaticMarkup(email)}`;
}
