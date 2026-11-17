"use client";

import { Fragment, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { TicketDetail } from "@/lib/types";

export type Sources = Record<string, { title: string; text: string }>;

const NEEDS_YOU = new Set(["awaiting_approval", "escalated"]);
const CITATION = /\[((?:HC-[A-Z]+#\d+)|(?:F\d+))\]/g;

// A reply with its citations as buttons: each opens the exact source it relies on.
export function CitedText({ text, sources }: { text: string; sources: Sources }) {
  const [open, setOpen] = useState<string | null>(null);
  const parts = text.split(CITATION);
  return (
    <div>
      <p className="whitespace-pre-line leading-relaxed">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(open === part ? null : part)}
              aria-expanded={open === part}
              className={`mx-0.5 rounded px-1 text-xs font-semibold ring-1 ${
                sources[part] ? "bg-blue-50 text-blue-800 ring-blue-200" : "bg-red-50 text-escalated ring-red-300"
              }`}
              title={sources[part] ? "Show the source" : "Unknown source"}
            >
              {part}
            </button>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
      </p>
      {open && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm">
          <p className="font-semibold">
            {open} {sources[open] ? `· ${sources[open].title}` : ""}
          </p>
          <p className="mt-1">{sources[open]?.text ?? "This citation matches no source."}</p>
        </div>
      )}
    </div>
  );
}

// The automatic checks run on an AI reply before anyone sends it.
function Verification({ v }: { v: Record<string, unknown> }) {
  if (!v || Object.keys(v).length === 0) return null;
  const unsupported = (v.unsupported_numbers as number[]) ?? [];
  const unknown = (v.unknown_citations as string[]) ?? [];
  const checks: [boolean, string][] = [
    [unknown.length === 0, unknown.length ? `Unknown sources: ${unknown.join(", ")}` : "Every source exists"],
    [
      unsupported.length === 0,
      unsupported.length
        ? `Numbers not found in its sources: ${unsupported.join(", ")}`
        : `${String(v.numbers_checked ?? 0)} numbers checked against the sources`,
    ],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {checks.map(([ok, label]) => (
        <li key={label} className={ok ? "text-sent" : "font-semibold text-escalated"}>
          <span aria-hidden>{ok ? "✓" : "✗"}</span> {label}
        </li>
      ))}
    </ul>
  );
}

// The reply box: the AI suggestion when there is one (edit it or not), or the agent's own words.
export function Composer({ ticket, sources, onSent }: { ticket: TicketDetail; sources: Sources; onSent: () => void }) {
  const draft = ticket.draft;
  const [text, setText] = useState(draft?.body ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const edited = draft && text.trim() !== draft.body.trim();

  async function send() {
    setSending(true);
    setError(null);
    try {
      const r = await api.reply(ticket.id, text.trim());
      if (r.status === "failed") setError("Saved, but not delivered. Check the email settings.");
      setText("");
      setPreview(false);
      onSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const where =
    ticket.channel === "forum"
      ? "Posted as a comment in the forum thread."
      : ticket.channel === "email"
        ? "Sent by email, in the customer's thread."
        : "The customer sees it in the chat and on their ticket page.";

  return (
    <div className={`rounded-xl border bg-white p-4 sm:p-5 ${draft && NEEDS_YOU.has(ticket.status) ? "border-review/50 ring-2 ring-amber-100" : "border-line"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{draft ? (edited ? "Your reply (edited from the AI suggestion)" : "AI suggestion") : "Reply"}</h2>
        {draft && (
          <button type="button" onClick={() => setPreview(!preview)} className="text-sm text-muted hover:text-ink">
            {preview ? "Edit" : "Check the sources"}
          </button>
        )}
      </div>
      {draft && !edited && (
        <div className="mt-1">
          <Verification v={draft.verification} />
        </div>
      )}
      {preview ? (
        <div className="mt-3 rounded-lg border border-line p-3 text-sm">
          <CitedText text={text} sources={sources} />
        </div>
      ) : (
        <textarea
          ref={box}
          aria-label="Reply to the customer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) send();
          }}
          rows={draft ? 8 : 4}
          placeholder="Write a reply…"
          className="mt-3 w-full rounded-lg border border-line p-3 text-sm leading-relaxed focus:border-ink"
        />
      )}
      {error && <p role="alert" className="mt-2 text-sm text-escalated">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-lg bg-ink px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
        {draft && text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setPreview(false);
              setTimeout(() => box.current?.focus(), 0);
            }}
            className="text-sm text-muted hover:text-ink"
          >
            Write my own instead
          </button>
        )}
        <p className="text-xs text-muted sm:ml-auto">{where}</p>
      </div>
    </div>
  );
}
