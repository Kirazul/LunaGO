"use client";

import { Dithering } from "@paper-design/shaders-react";
import { useSyncExternalStore } from "react";

// The portal's background: a slow field of dots, like a printed halftone that moves.
//
// It is the "Dithering" shader of Paper Shaders (https://shaders.paper.design, Apache 2.0), an
// open-source library of backgrounds drawn by the graphics card. "Dithering" means showing shades
// of grey with only two colours, by placing dots more or less densely. We only choose its
// settings here: the two colours, the moving shape behind the dots, their size and the speed.

// People who ask their system to reduce motion get the same picture, standing still.
const QUERY = "(prefers-reduced-motion: reduce)";
function watchMotion(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function DitherBackground() {
  const still = useSyncExternalStore(
    watchMotion,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  return (
    <Dithering
      aria-hidden
      className="absolute inset-0"
      width="100%"
      height="100%"
      colorBack="#05050d"
      colorFront="#57538a" // a muted indigo: bright dots on black tire the eyes
      shape="warp"
      type="4x4"
      size={2.4}
      scale={0.7}
      speed={still ? 0 : 0.14}
      frame={24000} // start from a moment where the shape is already spread out
      maxPixelCount={1920 * 1080} // large screens are not drawn at more than Full HD
    />
  );
}
