"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChannelMark } from "@/components/console/channel";
import { StatusPill } from "@/components/console/status";
import { TryPanel } from "@/components/console/try-panel";
import { useEvents } from "@/components/console/use-events";
import { api } from "@/lib/api";
import { humanize, senderName } from "@/lib/format";
import { ago } from "@/lib/time";
import type { Stats, TicketSummary } from "@/lib/types";

const TABS = [
  { id: "all", label: "All", statuses: null },
  { id: "todo", label: "To do", statuses: ["awaiting_approval", "escalated"] },
  { id: "ai", label: "Solved by AI", statuses: ["auto_send"] },
  { id: "waiting", label: "Waiting on customer", statuses: ["needs_info", "answered"] },
  { id: "closed", label: "Closed", statuses: ["closed", "no_reply"] },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Priority({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">…</span>;
  const tone = value >= 70 ? "bg-escalated" : value >= 40 ? "bg-review" : "bg-quiet";
  return (
    <span className="flex items-center gap-2" title={`Priority ${value} of 100`}>
      <span className="h-1.5 w-10 rounded-full bg-desk" aria-hidden>
        <span className={`block h-1.5 rounded-full ${tone}`} style={{ width: `${Math.max(value, 4)}%` }} />
      </span>
      <span className="w-6 text-right">{value}</span>
    </span>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("all");
  const [trying, setTrying] = useState(false);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const known = useRef<Set<number> | null>(null);
  const [version, setVersion] = useState(0); // bumped by live events: reload

  useEffect(() => {
    let active = true;
    Promise.all([api.tickets(), api.stats()])
      .then(([t, s]) => {
        if (!active) return;
        if (known.current) {
          // Conversations that are new arrive highlighted (not on the first load).
          const added = t.filter((x) => !known.current!.has(x.id)).map((x) => x.id);
          if (added.length) setFresh(new Set(added));
        }
        known.current = new Set(t.map((x) => x.id));
        setTickets(t);
        setStats(s);
        setError(null);
        setNow(Date.now());
      })
      .catch(() => active && setError("The server is not reachable right now. It may be waking up: this page retries on its own."));
    return () => {
      active = false;
    };
  }, [version]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (fresh.size === 0) return;
    const timer = setTimeout(() => setFresh(new Set()), 4000);
    return () => clearTimeout(timer);
  }, [fresh]);

  const connected = useEvents((event) => {
    if (event.type !== "stage") setVersion((v) => v + 1);
  });

  // Not connected yet (the server may be waking up): retry the list every few seconds.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setVersion((v) => v + 1), 5000);
    return () => clearTimeout(timer);
  }, [error, version]);

  const counts = useMemo(() => {
    const out = Object.fromEntries(TABS.map((t) => [t.id, 0])) as Record<TabId, number>;
    for (const t of tickets ?? []) {
      out.all += 1;
      for (const tb of TABS) if (tb.statuses && (tb.statuses as readonly string[]).includes(t.status)) out[tb.id] += 1;
    }
    return out;
  }, [tickets]);

  const shown = useMemo(() => {
    const statuses = TABS.find((x) => x.id === tab)!.statuses as readonly string[] | null;
    return (tickets ?? []).filter((t) => !statuses || statuses.includes(t.status));
  }, [tickets, tab]);

  const total = stats?.tickets ?? 0;
  const by = stats?.by_status ?? {};
  const solved = by.auto_send ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <span className="flex items-center gap-2 text-sm text-muted" role="status">
          <span className={`size-2 rounded-full ${connected ? "bg-sent" : "bg-quiet"}`} aria-hidden />
          {connected ? "Live" : "Connecting…"}
        </span>
        <button
          type="button"
          onClick={() => setTrying(!trying)}
          aria-expanded={trying}
          className="ml-auto rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-ink"
        >
          {trying ? "Close" : "Try it as a customer"}
        </button>
      </div>

      {trying && <TryPanel onSent={(id) => router.push(`/console/ticket/?id=${id}`)} />}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-review">
          {error}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Conversations", total, "All time"],
          ["Solved by AI", solved, total ? `${Math.round((solved / total) * 100)}% of all` : " "],
          ["Need a reply", by.awaiting_approval ?? 0, "Waiting for an agent"],
          ["Urgent", by.escalated ?? 0, "Safety or legal risk"],
        ].map(([label, value, hint]) => (
          <div key={label as string} className="rounded-xl border border-line bg-white px-4 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{stats ? value : "…"}</dd>
            <dd className="text-xs text-muted">{stats ? hint : " "}</dd>
          </div>
        ))}
      </dl>

      {/* Filters of the one list below (not ARIA tabs: there are no tab panels). */}
      <div role="group" aria-label="Show" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              tab === t.id ? "border-ink font-semibold" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 rounded-full px-1.5 text-xs ${t.id === "todo" && counts.todo ? "bg-amber-100 text-review" : "text-muted"}`}>
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Phones: one card per conversation. */}
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white md:hidden">
        {shown.map((t) => (
          <li key={t.id} className={fresh.has(t.id) ? "row-new" : ""}>
            <Link href={`/console/ticket/?id=${t.id}`} className="block px-4 py-3 active:bg-desk">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">{senderName(t)}</span>
                <StatusPill status={t.status} />
              </span>
              <span className="mt-1 line-clamp-2 text-sm">{t.summary ?? t.subject ?? "Reading the message…"}</span>
              <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                <ChannelMark channel={t.channel} showLabel={false} />
                {[t.team, ago(t.updated_at, now)].filter(Boolean).join(" · ")}
                {t.messages > 1 && ` · ${t.messages} messages`}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Message</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((t) => (
              <tr
                key={t.id}
                onClick={() => router.push(`/console/ticket/?id=${t.id}`)}
                className={`cursor-pointer align-top hover:bg-desk ${fresh.has(t.id) ? "row-new" : ""}`}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/console/ticket/?id=${t.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block max-w-48 truncate font-semibold underline-offset-2 hover:underline"
                  >
                    {senderName(t)}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <ChannelMark channel={t.channel} showLabel={false} />
                    {t.number}
                  </span>
                </td>
                <td className="max-w-md px-4 py-3">
                  <p className="line-clamp-2">{t.summary ?? t.subject ?? "Reading the message…"}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[t.team, ...t.categories.map(humanize)].filter(Boolean).join(" · ")}
                    {t.risk_flags.length > 0 && <span className="font-semibold text-escalated"> · risk: {t.risk_flags.map(humanize).join(", ")}</span>}
                    {t.messages > 1 && <span> · {t.messages} messages</span>}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <Priority value={t.priority} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  <time dateTime={t.updated_at} title={new Date(t.updated_at).toLocaleString()}>
                    {ago(t.updated_at, now)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tickets && shown.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-12 text-center text-muted">
          {tickets.length === 0 ? "No conversations yet. Use “Try it as a customer” to send the first one." : tab === "todo" ? "Nothing to do. Every conversation is handled." : "Nothing here right now."}
        </p>
      )}
      {!tickets && !error && <p className="mt-3 px-4 py-12 text-center text-muted">Loading…</p>}
    </main>
  );
}
