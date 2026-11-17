"use client";

import { useEffect, useState, type ReactNode } from "react";

import { VolumeChart } from "@/components/console/volume-chart";
import { api } from "@/lib/api";
import type { ExperimentRow, Insights } from "@/lib/types";

// Insights: what a large set of real customer messages shows, in four questions a newcomer would
// ask, each answered by one block: how many messages arrive, what suddenly went wrong, what
// customers write about most, and how well each part of the system works.

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const count = (n: number) => n.toLocaleString("en-GB");

/** How unusual a surge is, in words. The number behind it compares the day with the days before. */
function strength(z: number): { label: string; className: string } {
  if (z >= 10) return { label: "Major", className: "bg-red-50 text-escalated ring-red-200" };
  if (z >= 6) return { label: "Clear", className: "bg-amber-50 text-review ring-amber-200" };
  return { label: "Mild", className: "bg-gray-100 text-muted ring-gray-200" };
}

function Block({ id, title, lead, children }: { id: string; title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-1 max-w-[75ch] text-sm text-muted">{lead}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [rows, setRows] = useState<ExperimentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.insights(), api.experiments()])
      .then(([insights, experiments]) => {
        if (!active) return;
        setData(insights);
        setRows(experiments);
      })
      .catch((e: Error) => {
        if (active) setError(`The insights could not be loaded (${e.message}).`);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <main className="mx-auto max-w-5xl px-5 py-8"><p role="alert" className="text-escalated">{error}</p></main>;
  if (!data) return <main className="mx-auto max-w-5xl px-5 py-8 text-muted">Loading…</main>;

  const total = data.timeline.reduce((sum, d) => sum + d.messages, 0);
  const incidents = data.timeline
    .flatMap((d) => d.incidents.map((i) => ({ day: d.day, ...i })))
    .sort((a, b) => b.z - a.z)
    .slice(0, 8);
  const top = incidents[0];
  const groups = data.clusters.slice(0, 9);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="mt-2 max-w-[75ch] text-muted">
          What {count(total)} real customer messages tell us. LunaGo is new and has no history, so this page uses public
          messages sent to Uber&apos;s support account from October to December 2017. It shows what the system can find
          in a large pile of messages without anyone reading them.
        </p>
      </header>

      <Block
        id="volume"
        title="1. How many messages arrive each day?"
        lead="Each bar is one day. A bright bar is a day when one subject suddenly took off, which usually means something broke."
      >
        <VolumeChart timeline={data.timeline} />
      </Block>

      <Block
        id="incidents"
        title="2. What suddenly went wrong?"
        lead="The system watches the words customers use. When a word appears far more often than on the days before, it raises an alert and groups the words that surged together. These are the strongest alerts."
      >
        {top && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm ring-1 ring-red-200">
            <span className="font-semibold">The strongest: {day(top.day)}.</span> The words “{top.terms.slice(0, 3).join(", ")}”
            appeared in {count(top.messages)} messages in one day.
            {/* The story behind the best-known day of this dataset. */}
            {top.day === "2017-11-14" && " That day a free-doughnut promotion crashed the app, and the alert fired within the first hour."}
          </p>
        )}
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="py-1.5 pr-4 font-medium">Day</th>
              <th scope="col" className="py-1.5 pr-4 font-medium">Words that surged</th>
              <th scope="col" className="py-1.5 pr-4 text-right font-medium">Messages</th>
              <th scope="col" className="py-1.5 font-medium">How unusual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {incidents.map((i) => {
              const s = strength(i.z);
              return (
                <tr key={i.day + i.terms.join()}>
                  <td className="whitespace-nowrap py-2 pr-4">{day(i.day)}</td>
                  <td className="py-2 pr-4">{i.terms.join(", ")}</td>
                  <td className="py-2 pr-4 text-right">{count(i.messages)}</td>
                  <td className="py-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.className}`}>{s.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Block>

      <Block
        id="groups"
        title="3. What do customers write about most?"
        lead="Nobody told the system which subjects exist. It grouped the messages by meaning on its own. Each card is one group: its most typical words, how many messages it holds, and two real messages from it."
      >
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((c) => (
            <li key={c.id} className="rounded-lg border border-line p-4">
              <p className="font-semibold">{c.words.slice(0, 3).join(", ")}</p>
              <p className="text-sm text-muted">{count(c.size)} messages</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {c.examples.slice(0, 2).map((e) => (
                  <li key={e} className="line-clamp-2">“{e}”</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Block>

      <Block
        id="results"
        title="4. How well does each part of the system work?"
        lead="Each line is one test. Where two numbers are shown, the first is our method and the second is a simpler one it is compared with. Every number is read from the file named under it, written by the test itself."
      >
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="py-1.5 pr-4 font-medium">Part of the system</th>
              <th scope="col" className="py-1.5 pr-4 font-medium">What was tested</th>
              <th scope="col" className="py-1.5 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.claim}>
                <td className="py-2.5 pr-4 align-top font-semibold">{r.question}</td>
                <td className="py-2.5 pr-4 align-top">
                  {r.claim}
                  <span className="block text-xs text-muted">reports/results/{r.source}</span>
                </td>
                <td className="whitespace-nowrap py-2.5 align-top font-semibold">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
    </main>
  );
}
