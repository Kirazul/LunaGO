"use client";

import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

import { useSession } from "@/components/console/shell";
import { api } from "@/lib/api";
import type { Agreement, AnnotationItem, AnnotationProgress, GoldLabels } from "@/lib/types";

// Label messages: a person reads one customer message and answers a few questions about it.
// Those answers are the answer key the AI is graded against (researchers call it a "gold set"),
// so the questions are the same ones the AI answers in its "understand" step, and the choices
// are those of eval/annotation_guidelines.md. The values saved (left side of each pair below)
// are the ones the API expects; the wording shown to people is on the right.

const TYPES = [
  ["complaint", "Complaint", "Something went wrong and the customer holds the company responsible."],
  ["request", "Request", "Asks for information or an action; nothing went wrong."],
  ["feedback", "Feedback", "A suggestion or an opinion, with no specific bad experience."],
  ["praise", "Praise", "Thanks or a compliment."],
  ["spam_or_irrelevant", "Not for support", "An advert, gibberish, or a message meant for someone else."],
] as const;
const URGENCY = [
  ["immediate", "Yes, right now"],
  ["24h", "Yes, within 24 hours"],
  ["standard", "Yes, no rush"],
] as const;
const TOPICS = [
  ["fare_billing", "Fare or billing"],
  ["driver_behaviour", "Driver behaviour"],
  ["safety_incident", "Safety incident"],
  ["lost_item", "Lost item"],
  ["cancellation_no_show", "Cancellation or no-show"],
  ["app_technical", "App problem"],
  ["account_access", "Account access"],
  ["promotions_credits", "Promotions or credits"],
  ["accessibility", "Accessibility"],
  ["other", "Something else"],
] as const;
const SEVERITY = [
  "No reproach: reports the problem without blaming anyone",
  "Disapproval: unhappy, without accusing",
  "Accusation: says the company did something wrong",
  "Blame: holds the company responsible, with insults, threats or demands",
];
const RISKS = [
  ["safety", "Safety"],
  ["injury", "Injury"],
  ["harassment_discrimination", "Harassment or discrimination"],
  ["legal_threat", "Legal action (lawyer, court, police report)"],
  ["fraud_account_takeover", "Fraud or a stolen account"],
  ["media_threat", "Going to the press or going viral"],
  ["vulnerable_person", "A child, elderly, disabled or distressed person"],
] as const;
const LISTS = [
  ["pilot", "Practice list", "50 messages that both of us label, to check that we understand the rules the same way."],
  ["gold_en", "English test messages", "Real messages in English. The AI is graded against these labels."],
  ["gold_fr", "French test messages", "Messages in French, written by the team (see the box on the right)."],
] as const;
const QUESTION_NAMES: Record<string, string> = {
  message_type: "Kind of message",
  response_required: "Needs a reply?",
  urgency: "How fast",
  main_category: "Main subject",
  severity: "How strongly",
};

const EMPTY: GoldLabels = {
  message_type: "", response_required: true, urgency: null, categories: [], severity: null, risk_flags: [],
};

/** The name shown for one line of the agreement table (the API sends e.g. "risk:safety"). */
function questionName(field: string): string {
  if (!field.startsWith("risk:")) return QUESTION_NAMES[field] ?? field;
  const risk = RISKS.find(([value]) => value === field.slice(5));
  return `Risk: ${risk ? risk[1].toLowerCase() : field.slice(5)}`;
}

/** What is still missing before the answers can be saved. */
function missing(l: GoldLabels): string[] {
  const out = [];
  if (!l.message_type) out.push("question 1");
  if (l.response_required && !l.urgency) out.push("question 2");
  if (l.categories.length === 0) out.push("question 3");
  if (l.message_type === "complaint" && l.severity === null) out.push("question 4");
  return out;
}

function Choice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-sm ring-1 ${active ? "bg-ink font-semibold text-white ring-ink" : "bg-white ring-line hover:ring-ink"}`}
    >
      {label}
    </button>
  );
}

function Question({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-5">
      <legend className="float-left mb-3 w-full font-semibold">
        <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-ink text-xs text-white">{n}</span>
        {title}
      </legend>
      {hint && <p className="clear-both mb-3 text-sm text-muted">{hint}</p>}
      <div className="clear-both flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export default function AnnotatePage() {
  const annotator = useSession()?.user.username ?? "";
  const [list, setList] = useState<string>("pilot");
  const [item, setItem] = useState<AnnotationItem | null | undefined>(undefined);
  const [progress, setProgress] = useState<AnnotationProgress | null>(null);
  const [labels, setLabels] = useState<GoldLabels>(EMPTY);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frText, setFrText] = useState("");
  const [version, setVersion] = useState(0); // bumped to load the next message
  const explain = (e: unknown) => (e as Error).message;

  useEffect(() => {
    if (!annotator) return;
    let active = true;
    api
      .annotateNext(list)
      .then((r) => {
        if (!active) return;
        setItem(r.item);
        setProgress(r.progress);
        setLabels(EMPTY);
        setError(null);
      })
      .catch((e: Error) => active && setError(e.message));
    api.agreement(list).then((a) => active && setAgreement(a)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [annotator, list, version]);

  const save = useCallback(async () => {
    if (!item || missing(labels).length) return;
    try {
      await api.annotateSave(item.id, {
        ...labels,
        urgency: labels.response_required ? labels.urgency : null,
        severity: labels.message_type === "complaint" ? labels.severity : null,
      });
      setVersion((v) => v + 1);
    } catch (e) {
      setError(explain(e));
    }
  }, [item, labels]);

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
  }

  const toggle = (values: string[], value: string, max = 99) =>
    values.includes(value) ? values.filter((v) => v !== value) : values.length < max ? [...values, value] : values;

  const left = missing(labels);
  const done = progress?.labelled[list]?.[annotator] ?? 0;
  const total = progress?.items[list] ?? 0;
  const chosenType = TYPES.find(([value]) => value === labels.message_type);
  const isComplaint = labels.message_type === "complaint";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8" onKeyDown={onKey}>
      <h1 className="text-2xl font-semibold">Label messages</h1>
      <p className="mt-2 max-w-[75ch] text-muted">
        Read one customer message and answer the questions about it. Your answers are the answer key: the AI answers
        the same questions, and we count how often it matches you. The full rules are in eval/annotation_guidelines.md.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Which list">
        {LISTS.map(([value, label]) => (
          <Choice key={value} label={label} active={list === value} onClick={() => setList(value)} />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{LISTS.find(([value]) => value === list)?.[2]}</p>
      {total > 0 && (
        <div className="mt-4 max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-sent" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-sm text-muted">
            You have labelled {done} of {total} in this list.
          </p>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-escalated">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_21rem]">
        <section aria-label="Message to label">
          {item === null ? (
            <p className="rounded-xl border border-dashed border-line bg-white p-8 text-muted">
              You have labelled every message of this list. Thank you.
            </p>
          ) : item ? (
            <div className="space-y-4">
              <blockquote className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs font-semibold text-muted">The customer wrote ({item.lang === "fr" ? "French" : "English"})</p>
                <p className="mt-2 text-lg leading-relaxed">{item.text}</p>
              </blockquote>

              <Question n={1} title="What kind of message is it?" hint={chosenType?.[2]}>
                {TYPES.map(([value, label]) => (
                  <Choice key={value} label={label} active={labels.message_type === value}
                    onClick={() => setLabels({ ...labels, message_type: value, severity: value === "complaint" ? labels.severity : null })} />
                ))}
              </Question>

              <Question n={2} title="Does it need a reply, and how fast?" hint="Right now: safety, injury, harassment, someone stranded, an account being taken over. Within 24 hours: money lost, a lost item, or the customer cannot ride or log in. No rush: everything else.">
                {URGENCY.map(([value, label]) => (
                  <Choice key={value} label={label} active={labels.response_required && labels.urgency === value}
                    onClick={() => setLabels({ ...labels, response_required: true, urgency: value })} />
                ))}
                <Choice label="No reply needed" active={!labels.response_required}
                  onClick={() => setLabels({ ...labels, response_required: false, urgency: null })} />
              </Question>

              <Question n={3} title="What is it about?" hint="Choose up to three, the main subject first. When safety is involved, Safety incident comes first.">
                {TOPICS.map(([value, label]) => {
                  const rank = labels.categories.indexOf(value);
                  return (
                    <Choice key={value} label={rank >= 0 ? `${rank + 1}. ${label}` : label} active={rank >= 0}
                      onClick={() => setLabels({ ...labels, categories: toggle(labels.categories, value, 3) })} />
                  );
                })}
              </Question>

              {isComplaint && (
                <Question n={4} title="How strongly does the customer complain?" hint="Judge how it is said, not how dangerous the situation is: a calm report of an assault is level 1, with a risk below.">
                  {SEVERITY.map((label, i) => (
                    <Choice key={label} label={label} active={labels.severity === i + 1}
                      onClick={() => setLabels({ ...labels, severity: i + 1 })} />
                  ))}
                </Question>
              )}

              <Question n={isComplaint ? 5 : 4} title="Any danger or legal risk?" hint="Optional. Leave empty if there is none. When unsure about safety, choose it.">
                {RISKS.map(([value, label]) => (
                  <Choice key={value} label={label} active={labels.risk_flags.includes(value)}
                    onClick={() => setLabels({ ...labels, risk_flags: toggle(labels.risk_flags, value) })} />
                ))}
              </Question>

              <label className="block text-sm">
                <span className="font-semibold">A note, if you hesitated (optional)</span>
                <input value={labels.note ?? ""} onChange={(e) => setLabels({ ...labels, note: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2" />
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={save} disabled={left.length > 0}
                  className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-white disabled:opacity-50">
                  Save and show the next message
                </button>
                {left.length > 0 && <span className="text-sm text-muted">Still to answer: {left.join(", ")}.</span>}
              </div>
            </div>
          ) : (
            <p className="text-muted">Loading…</p>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-semibold">Do we agree with each other?</h2>
            <p className="mt-1 text-sm text-muted">
              When two people label the same message, their answers are compared. If people disagree, the rules are
              unclear, and the AI cannot be graded fairly.
            </p>
            {agreement && agreement.double_labelled_items > 0 ? (
              <>
                <table className="mt-3 w-full text-sm">
                  <thead className="text-muted">
                    <tr>
                      <th scope="col" className="text-left font-medium">Question</th>
                      <th scope="col" className="text-right font-medium">Same answer</th>
                      <th scope="col" className="text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(agreement.fields).map(([field, v]) => (
                      <tr key={field}>
                        <td className="py-1">{questionName(field)}</td>
                        <td className="py-1 text-right">{Math.round(v.agreement * 100)}%</td>
                        <td className="py-1 text-right">{(v.kappa ?? v.kappa_quadratic) ?? "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted">
                  {agreement.double_labelled_items} messages labelled by two people. The score (Cohen&apos;s kappa) removes the
                  agreement that would happen by luck: 1 is perfect, above 0.6 is good, 0 is no better than chance.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Nothing to compare yet: it appears once two people have labelled the same messages.</p>
            )}
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-semibold">Add a French message</h2>
            <p className="mt-1 text-sm text-muted">
              No public set of French complaints can be used freely, so we write our own. Type a message as a French-speaking
              customer would, with invented details. It joins the French test messages.
            </p>
            <textarea aria-label="French message" value={frText} onChange={(e) => setFrText(e.target.value)} rows={4}
              className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              placeholder="Ex. : Le chauffeur a pris un détour et j'ai payé 12 $ de plus." />
            <button type="button" disabled={frText.trim().length < 2}
              onClick={async () => {
                try {
                  await api.annotateAddItem(frText, "fr");
                  setFrText("");
                  setVersion((v) => v + 1);
                } catch (e) {
                  setError(explain(e));
                }
              }}
              className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-ink disabled:opacity-50">
              Add to the French test messages
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
