"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ComplaintLensMark, LunaGoMark } from "@/components/brand";
import { HUB_BUTTON, HubText } from "@/components/hub-button";

// The portal's two buttons: the customer site and the admin console.

// The customer site exists in English and French: its button opens the visitor's language (the
// site itself has a language switch). The language is read from the browser after the page has
// loaded, because the page is the same static file for everyone.
const noChange = () => () => {};
const prefersFrench = () => navigator.languages?.some((l) => l.toLowerCase().startsWith("fr")) ?? false;

export function Doors() {
  const french = useSyncExternalStore(noChange, prefersFrench, () => false);
  return (
    <div className="mx-auto grid w-full max-w-md gap-3">
      <Link href={french ? "/fr" : "/en"} className={HUB_BUTTON}>
        <LunaGoMark size={40} tile />
        <HubText title="Customer site" hint="Sign in, book a ride, talk to support" />
      </Link>
      <Link href="/console" className={HUB_BUTTON}>
        <ComplaintLensMark size={40} />
        <HubText title="Admin console" hint="Staff sign-in: every conversation, read by the AI" />
      </Link>
    </div>
  );
}
