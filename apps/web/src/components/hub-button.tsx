import type { ReactNode } from "react";

// The buttons of the portal and of the customer site's home page: an icon, a title and
// (optionally) one line saying what the button opens. Use HUB_BUTTON, or HUB_BUTTON_SMALL for the
// secondary row, as the className of a <Link>, an <a> or a <button>, with <HubIcon> and
// <HubText> inside. Colours are written out (not theme names) so the buttons look the same on
// every page.

const LOOK =
  "flex w-full items-center rounded-2xl border border-[#2a2850] bg-[#0c0b1a]/90 text-left backdrop-blur-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#f2a33a] hover:bg-[#12112a]";
export const HUB_BUTTON = `${LOOK} gap-4 px-5 py-4`;
export const HUB_BUTTON_SMALL = `${LOOK} gap-3 px-4 py-3`;

export function HubText({ title, hint, small = false }: { title: string; hint?: string; small?: boolean }) {
  return (
    <span>
      <span className={`block font-display font-bold text-[#f5f3ff] ${small ? "text-base" : "text-lg"}`}>{title}</span>
      {hint && <span className="block text-sm text-[#b4b0d6]">{hint}</span>}
    </span>
  );
}

/** A small square holding a line icon (the paths of a 24 x 24 drawing, passed as children). */
export function HubIcon({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl bg-[#1a1838] text-[#f2a33a] ${small ? "size-8" : "size-10"}`}>
      <svg
        viewBox="0 0 24 24"
        className={small ? "size-5" : "size-6"}
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}
