// The cards beside a conversation in the console: why the AI decided what it did, the ride
// check, who the customer is, and what the AI understood.

import type { ReactNode } from "react";

import { ChannelMark } from "@/components/console/channel";
import { statusLabel } from "@/components/console/status";
import { humanize } from "@/lib/format";
import type { TicketDetail } from "@/lib/types";

/** A fact about the customer's ride that a reply may quote, e.g. { id: "F1", text: "…" }. */
export type Fact = { id: string; text: string };

export function Decision({ ticket }: { ticket: TicketDetail }) {
  const d = ticket.decision;
  if (!d) return null;
  return (
    <Card title="Why the AI decided this">
      <p className="text-sm">
        Decision: <span className="font-semibold">{statusLabel(d.action)}</span>
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
        {d.reasons.map((r) => (
          <li key={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</li>
        ))}
      </ul>
    </Card>
  );
}

// How a ride problem is checked: the ride is found only by its ID, on the customer's own account;
// what the customer says is then checked against the record, and the facts the reply may use are
// computed by code.
export function RideCheck({ ticket, facts }: { ticket: TicketDetail; facts: Fact[] }) {
  const link = ticket.stages.find((s) => s.name === "link");
  if (!link) return null;
  const out = link.output as {
    about_ride?: boolean;
    ride_ids_quoted?: string[];
    checks?: { ok: boolean; text: string }[];
    customer?: { has_account?: boolean; rides?: number };
  };
  const trip = ticket.trip;
  const account = out.customer?.has_account ? "Has an account" : "Guest (no account)";
  return (
    <Card title="Ride check">
      {!out.about_ride ? (
        <p className="text-sm text-muted">Not about a specific ride: no ride needed.</p>
      ) : trip ? (
        <>
          <p className="text-sm">
            Ride <span className="font-semibold">{String(trip.id)}</span>, on this customer&apos;s account.
          </p>
          {(out.checks ?? []).length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm">
              {(out.checks ?? []).map((c) => (
                <li key={c.text} className={c.ok ? "" : "text-review"}>
                  <span aria-hidden>{c.ok ? "✓ " : "✗ "}</span>
                  {c.text.charAt(0).toUpperCase() + c.text.slice(1)}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-3 text-sm font-semibold">What the record says</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {facts.map((f) => (
              <li key={f.id} className={f.text.startsWith("The customer mentions") ? "text-review" : ""}>
                <span className="font-semibold">{f.id}</span> {f.text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Replies may only use these facts. Every number is checked.</p>
        </>
      ) : (
        <p className="text-sm">
          {out.ride_ids_quoted?.length
            ? `${out.ride_ids_quoted.join(", ")} is not on this customer's account, so the AI asked again.`
            : "No ride ID yet, so the AI asked the customer for it."}
          <span className="mt-1 block text-muted">
            {account}, {out.customer?.rides ?? 0} rides.
          </span>
        </p>
      )}
    </Card>
  );
}

export function CustomerCard({ ticket }: { ticket: TicketDetail }) {
  return (
    <Card title="Customer">
      <dl className="space-y-1.5 text-sm">
        <Row label="Name">{ticket.customer?.name || ticket.sender_name || "Not given"}</Row>
        <Row label="Contact"><span className="break-all">{ticket.sender}</span></Row>
        <Row label="Channel"><ChannelMark channel={ticket.channel} /></Row>
        <Row label="Language">{ticket.language === "fr" ? "French" : ticket.language === "en" ? "English" : "…"}</Row>
        <Row label="Team">{ticket.team ?? "…"}</Row>
        <Row label="Priority">{ticket.priority != null ? `${ticket.priority} of 100` : "…"}</Row>
      </dl>
    </Card>
  );
}

export function Understanding({ ticket }: { ticket: TicketDetail }) {
  const a = ticket.analysis as Record<string, unknown> | null;
  if (!a) return null;
  const list = (v: unknown) => ((v as string[]) ?? []).map(humanize).join(", ") || "none";
  return (
    <Card title="What the AI understood">
      <p className="text-sm">{String(a.summary ?? "")}</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Goal">{String(a.customer_goal ?? "")}</Row>
        <Row label="Type">{humanize(String(a.message_type ?? ""))}</Row>
        <Row label="Topics">{list(a.categories)}</Row>
        <Row label="Risk"><span className={(a.risk_flags as string[])?.length ? "font-semibold text-escalated" : ""}>{list(a.risk_flags)}</span></Row>
      </dl>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
