"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A panel that opens over the page (sign in, book a ride, your rides) instead of a separate page.
// It is the browser's own <dialog>: Escape closes it, the page behind cannot be clicked or
// reached with the Tab key while it is open, and focus returns to the button that opened it.

export function Modal({
  title,
  close,
  onClose,
  wide = false,
  children,
}: {
  title: string; // shown at the top, and read by screen readers
  close: string; // the close button's name, in the page's language
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onClose={onClose}
      // A click on the dark area around the panel (the dialog element itself) closes it.
      onClick={(e) => e.target === dialog.current && onClose()}
      className={`m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-3xl border border-lilac bg-white p-0 text-left text-slate shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm ${
        wide ? "max-w-2xl" : "max-w-md"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-lilac bg-white px-6 py-4">
        <h2 className="font-display text-xl font-bold text-night">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={close}
          className="grid size-9 place-items-center rounded-full text-slate ring-1 ring-lilac hover:text-night hover:ring-night"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-6">{children}</div>
    </dialog>
  );
}
