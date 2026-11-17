"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ChannelMark } from "@/components/console/channel";
import { api } from "@/lib/api";
import { FORUM_URL, SUPPORT_EMAIL } from "@/lib/config";

const EXAMPLES = [
  "J'ai été facturé deux fois pour ma course d'hier soir !",
  "The driver took a huge detour on ride LG-45782, the fare doubled.",
  "The driver was texting while driving on the highway and I felt unsafe.",
  "How do cancellation fees work?",
];

// Send a test message, or open one of the real customer channels.
export function TryPanel({ onSent }: { onSent: (ticketId: number) => void }) {
  const [draft, setDraft] = useState(EXAMPLES[0]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      // example.com is reserved for examples (RFC 2606).
      const t = await api.submit({ email: "console.demo@example.com", body: draft, channel: "web" });
      onSent(t.id);
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  const link = "underline-offset-2 hover:underline";
  return (
    <section aria-label="Try it as a customer" className="mt-4 rounded-xl border border-line bg-white p-4">
      <form onSubmit={send}>
        <label className="text-sm font-medium" htmlFor="test-message">
          Write a message as a customer would (English or French)
        </label>
        <textarea
          id="test-message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setDraft(example)}
              title={example}
              className="max-w-60 truncate rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink"
            >
              {example}
            </button>
          ))}
          <button
            type="submit"
            disabled={sending || draft.trim().length < 2}
            className="ml-auto rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send and watch"}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-escalated">{error}</p>}
      </form>
      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-sm text-muted">
        <span>Or use a real channel:</span>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={link}><ChannelMark channel="email" /></a>
        <Link href="/en/contact" className={link}><ChannelMark channel="web" /></Link>
        <Link href="/en/?chat=open" className={link}><ChannelMark channel="chat" /></Link>
        <Link href="/en/rate" className={link}><ChannelMark channel="review" /></Link>
        <a href={FORUM_URL} target="_blank" rel="noreferrer" className={link}><ChannelMark channel="forum" /></a>
      </p>
    </section>
  );
}
