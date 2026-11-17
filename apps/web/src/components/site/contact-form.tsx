"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAccount } from "@/components/site/account";
import { FIELD } from "@/components/site/field";
import { RideField } from "@/components/site/ride-field";
import { api, ApiError } from "@/lib/api";
import type { Dict, Lang } from "@/lib/i18n";
import { normaliseRideId, RIDE_ID } from "@/lib/ride-id";

export function ContactForm({ lang, t }: { lang: Lang; t: Dict["contact"] }) {
  const router = useRouter();
  const me = useAccount();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = me?.customer.email ?? String(data.get("email") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();
    const ride = normaliseRideId(String(data.get("ride") ?? ""));
    if (!email || body.length < 2) return setError(t.errorEmpty);
    if (ride && !RIDE_ID.test(ride)) return setError(t.errorRide);
    setSending(true);
    setError(null);
    try {
      const ticket = await api.submit({
        email,
        body,
        name: me?.customer.name || String(data.get("name") ?? "").trim() || undefined,
        ride: ride || undefined,
        channel: "web",
      });
      router.push(`/${lang}/track/?id=${ticket.id}&k=${encodeURIComponent(ticket.track_key)}`);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 429 ? t.errorBusy : status === 422 ? t.errorEmail : t.errorNetwork);
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {!me && (
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-night">{t.name}</span>
            <input name="name" autoComplete="name" placeholder={t.namePlaceholder} className={FIELD} />
          </label>
          <label className="block">
            <span className="font-semibold text-night">{t.email}</span>
            <input name="email" type="email" required autoComplete="email" className={FIELD} />
          </label>
        </div>
      )}
      <div className="max-w-md">
        <RideField me={me} lang={lang} t={t} />
      </div>
      <label className="block">
        <span className="font-semibold text-night">{t.message}</span>
        <textarea name="body" required rows={7} maxLength={5000} className={`${FIELD} resize-y`} />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-amber/15 px-4 py-3 text-night">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="rounded-full bg-night px-7 py-3 font-semibold text-paper hover:bg-night-soft disabled:opacity-60"
      >
        {sending ? t.sending : t.send}
      </button>
    </form>
  );
}
