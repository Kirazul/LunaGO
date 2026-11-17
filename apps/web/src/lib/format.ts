// How values are written for people: money, dates, durations, labels, names.

import type { Lang } from "./i18n";

const locale = (lang: Lang) => (lang === "fr" ? "fr-CA" : "en-CA");

export function money(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(locale(lang), { style: "currency", currency: "CAD" }).format(amount);
}

export function dateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function dateOnly(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium" }).format(new Date(iso));
}

/** How long a pipeline step took: "0.42 ms", "35 ms", "1.20 s". */
export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 10 ? 2 : 0)} ms`;
}

/** A label from the API as words: "fare_billing" becomes "fare billing". */
export function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

/** Who wrote to us: "@login" for a forum post, otherwise the customer's name or address. */
export function senderName(t: { sender: string; sender_name: string | null; customer?: { name: string } | null }): string {
  if (t.sender.startsWith("forum:")) return `@${t.sender.slice(6)}`;
  return t.customer?.name || t.sender_name || t.sender;
}
