"use client";

import { useEffect, useState } from "react";

import { FIELD } from "@/components/site/field";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { Dict, Lang } from "@/lib/i18n";
import type { Account, Ride } from "@/lib/types";

// Which ride a message is about: a list of the customer's rides when signed in, an optional ride
// ID box otherwise. The value is submitted as the form field "ride".
export function RideField({ me, lang, t }: { me: Account | null | undefined; lang: Lang; t: Dict["contact"] }) {
  const [rides, setRides] = useState<Ride[]>([]);
  useEffect(() => {
    if (me) api.myRides().then(setRides).catch(() => setRides([]));
  }, [me]);

  if (me)
    return (
      <label className="block">
        <span className="font-semibold text-night">{t.ride}</span>
        <select name="ride" defaultValue="" className={FIELD}>
          <option value="">{t.rideNone}</option>
          {rides.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id} · {r.pickup} → {r.dropoff} · {dateTime(r.started_at, lang)}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <label className="block">
      <span className="font-semibold text-night">{t.rideId}</span>
      <input name="ride" placeholder={t.rideIdPlaceholder} autoCapitalize="characters" className={FIELD} />
    </label>
  );
}
