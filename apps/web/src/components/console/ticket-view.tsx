"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CitedText, Composer, type Sources } from "@/components/console/reply-panel";
import { StageTimeline } from "@/components/console/stage-timeline";
import { STATUS, StatusPill } from "@/components/console/status";
import { CustomerCard, Decision, RideCheck, Understanding, type Fact } from "@/components/console/ticket-cards";
import { useEvents } from "@/components/console/use-events";
import { api } from "@/lib/api";
import { formatMs, senderName } from "@/lib/format";
import { ago } from "@/lib/time";
import type { ThreadItem, TicketDetail } from "@/lib/types";

export function TicketView({ ticketId }: Readonly<{ ticketId: number }>) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState<Sources>({});
  const [version, setVersion] = useState(0); // bumped by live events for this ticket: reload
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    api
      .ticket(ticketId)
      .then((t) => {
        if (!active) return;
        setTicket(t);
        setError(null);
        setNow(Date.now());
      })
      .catch((e: Error) => active && setError(e.message === "ticket not found" ? "This conversation does not exist." : e.message));
    return () => {
      active = false;
    };
  }, [ticketId, version]);

  useEffect(() => {
    Promise.all([api.knowledge("en"), api.knowledge("fr")])
      .then(([en, fr]) => {
        const map: Sources = {};
        for (const [lang, articles] of [["en", en], ["fr", fr]] as const)
          for (const a of articles)
            for (const s of a.sections) map[`${lang}:${s.id}`] = { title: `${a.title} > ${s.heading}`, text: s.text };
        setHelp(map);
      })
      .catch(() => undefined);
  }, []);

  useEvents((event) => {
    if (event.ticket_id === ticketId) setVersion((v) => v + 1);
  });

  const facts = useMemo<Fact[]>(
    () => (ticket?.stages.find((s) => s.name === "link")?.output.facts as Fact[] | undefined) ?? [],
    [ticket],
  );

  const sources = useMemo<Sources>(() => {
    const lang = ticket?.language === "fr" ? "fr" : "en";
    const out: Sources = {};
    for (const [key, value] of Object.entries(help)) if (key.startsWith(`${lang}:`)) out[key.slice(3)] = value;
    for (const f of facts) out[f.id] = { title: "Fact from the customer's record (computed by code)", text: f.text };
    return out;
  }, [help, ticket?.language, facts]);

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Link href="/console" className="text-sm text-muted hover:text-ink">Inbox</Link>
        <p role="alert" className="mt-4 text-escalated">{error}</p>
      </main>
    );
  }
  if (!ticket) return <main className="mx-auto max-w-7xl px-5 py-8 text-muted">Loading…</main>;

  const reload = () => setVersion((v) => v + 1);
  const name = senderName(ticket);
  const resolved = ticket.status === "closed" || ticket.status === "no_reply";

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <Link href="/console" className="text-sm text-muted hover:text-ink">
        <span aria-hidden>‹ </span>Inbox
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <StatusPill status={ticket.status} />
        <span className="text-sm text-muted">{ticket.number}</span>
        <StatusButton ticket={ticket} resolved={resolved} onDone={reload} />
      </div>
      <p className="mt-1 text-sm text-muted">{STATUS[ticket.status]?.help}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Conversation" className="space-y-4">
          <div className="space-y-4 rounded-xl border border-line bg-white p-4 sm:p-5">
            {ticket.subject && <p className="font-semibold">{ticket.subject}</p>}
            {ticket.thread.map((m, i) => (
              <Bubble key={i} item={m} customer={name} now={now} sources={sources} />
            ))}
            {ticket.status === "processing" && (
              <p className="flex items-center gap-2 text-sm text-muted" role="status">
                <span className="size-2 animate-pulse rounded-full bg-blue-500" aria-hidden />
                The AI is reading the latest message…
              </p>
            )}
          </div>
          <Composer key={ticket.draft?.id ?? "none"} ticket={ticket} sources={sources} onSent={reload} />
        </section>

        <aside className="space-y-4">
          <Decision ticket={ticket} />
          <RideCheck ticket={ticket} facts={facts} />
          <CustomerCard ticket={ticket} />
          <Understanding ticket={ticket} />
          <details className="group rounded-xl border border-line bg-white">
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold">
              <span className="mr-1 inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
              How the AI processed it
              {ticket.total_ms != null && <span className="ml-2 text-sm font-normal text-muted">6 steps, {formatMs(ticket.total_ms)}</span>}
            </summary>
            <div className="border-t border-line p-4">
              <StageTimeline stages={ticket.stages} processing={ticket.status === "processing"} />
            </div>
          </details>
        </aside>
      </div>
    </main>
  );
}

function Bubble({ item, customer, now, sources }: { item: ThreadItem; customer: string; now: number; sources: Sources }) {
  const mine = item.from === "lunago";
  const who = !mine ? customer : item.author ? `${item.author} (agent)` : "AI assistant";
  const kind =
    item.kind === "acknowledgement"
      ? "automatic acknowledgement"
      : item.kind === "escalation"
        ? "safety message"
        : item.kind === "question"
          ? "asked for the ride ID"
          : null;
  const delivery =
    item.status === "queued"
      ? "waiting to be posted on the forum"
      : item.status === "failed"
        ? item.error === "no outbound delivery for this channel"
          ? "not delivered: no way to reach the customer on this channel"
          : `not delivered: ${item.error ?? "unknown error"}`
        : null;
  return (
    <article className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <p className="mb-1 px-1 text-xs text-muted">
        <span className="font-medium text-ink">{who}</span>
        {kind && ` · ${kind}`} · <time dateTime={item.at} title={new Date(item.at).toLocaleString()}>{ago(item.at, now)}</time>
      </p>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
          mine ? "rounded-tr-md bg-teal-50/70 ring-1 ring-teal-200" : "rounded-tl-md bg-desk"
        }`}
      >
        {mine ? <CitedText text={item.body} sources={sources} /> : <p className="whitespace-pre-line leading-relaxed">{item.body}</p>}
      </div>
      {delivery && <p className={`mt-1 px-1 text-xs ${item.status === "failed" ? "text-escalated" : "text-muted"}`}>{delivery}</p>}
    </article>
  );
}

function StatusButton({ ticket, resolved, onDone }: { ticket: TicketDetail; resolved: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (ticket.status === "processing") return null;
  async function toggle() {
    setBusy(true);
    setFailed(false);
    try {
      await api.setResolved(ticket.id, !resolved);
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="flex items-center gap-3 sm:ml-auto">
      {failed && (
        <span role="alert" className="text-sm text-review">
          Not saved. Try again.
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-sm font-semibold hover:border-ink disabled:opacity-60"
      >
        {resolved ? "Reopen" : "Mark as resolved"}
      </button>
    </span>
  );
}
