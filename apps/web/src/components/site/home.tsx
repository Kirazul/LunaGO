"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { HUB_BUTTON, HUB_BUTTON_SMALL, HubIcon, HubText } from "@/components/hub-button";
import { Modal } from "@/components/modal";
import { AuthForm, useAccount } from "@/components/site/account";
import { BookingForm } from "@/components/site/booking-form";
import { ContactForm } from "@/components/site/contact-form";
import { RateForm } from "@/components/site/rate-form";
import { YourRides } from "@/components/site/your-rides";
import { FORUM_URL } from "@/lib/config";
import type { Dict, Lang } from "@/lib/i18n";

// The customer site's home page: buttons only. Each one opens what it names in a panel over the
// page, without leaving it.
// - First row: sign in (signed out), or book a ride and see your rides (signed in).
// - Second row, for everyone: live support, contact, rate a ride, community forum.
// "Live support" opens the chat (components/site/chat-widget.tsx), which listens for ?chat=open
// in the address; the community forum is another website (GitHub Discussions).

type Panel = "account" | "book" | "rides" | "contact" | "rate" | null;

export function Home({ lang, t }: { lang: Lang; t: Dict }) {
  const me = useAccount();
  const [panel, setPanel] = useState<Panel>(null);
  const chatAsked = useSearchParams().get("chat") === "open";
  // Two cases where an open panel must go away by itself: the customer has just signed in, or
  // asked for the chat from inside a panel ("Get help with this ride"). State is corrected while
  // rendering, which React allows for exactly this.
  if ((panel === "account" && me) || (panel && chatAsked)) setPanel(null);

  if (me === undefined) return <div className="h-80" aria-busy />; // the browser has not read the session yet

  const first = me ? me.customer.name.split(/\s+/)[0] || me.customer.email : "";
  const close = () => setPanel(null);

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <h1 className="font-display text-[clamp(2rem,5.4vw,3rem)] font-extrabold leading-tight tracking-tight text-amber">
        {me ? t.home.hello.replace("{name}", first) : t.home.welcome}
      </h1>

      <div className="mt-8 grid gap-3">
        {me ? (
          <>
            <button type="button" onClick={() => setPanel("book")} className={HUB_BUTTON}>
              <HubIcon>
                <path d="M4 16v-3.5l1.7-4.2A2 2 0 0 1 7.6 7h8.8a2 2 0 0 1 1.9 1.3l1.7 4.2V16" />
                <path d="M3 16h18v2.5H3z" />
              </HubIcon>
              <HubText title={t.nav.book} />
            </button>
            <button type="button" onClick={() => setPanel("rides")} className={HUB_BUTTON}>
              <HubIcon>
                <path d="M8 7h11M8 12h11M8 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
              </HubIcon>
              <HubText title={t.nav.rides} />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setPanel("account")} className={HUB_BUTTON}>
            <HubIcon>
              <circle cx="12" cy="8.5" r="3.5" />
              <path d="M5 19.5c1.2-3.2 3.8-4.8 7-4.8s5.8 1.6 7 4.8" />
            </HubIcon>
            <HubText title={t.home.account} />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href={`/${lang}/?chat=open`} scroll={false} className={HUB_BUTTON_SMALL}>
          <HubIcon small>
            <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-7l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5Z" />
          </HubIcon>
          <HubText small title={t.home.support} />
        </Link>
        <button type="button" onClick={() => setPanel("contact")} className={HUB_BUTTON_SMALL}>
          <HubIcon small>
            <path d="M4 6.5h16v11H4z" />
            <path d="M4.5 7l7.5 6 7.5-6" />
          </HubIcon>
          <HubText small title={t.nav.contact} />
        </button>
        <button type="button" onClick={() => setPanel("rate")} className={HUB_BUTTON_SMALL}>
          <HubIcon small>
            <path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.6l-4.8 2.5.9-5.4L4.2 9.9l5.4-.8z" />
          </HubIcon>
          <HubText small title={t.contact.rate} />
        </button>
        <a href={FORUM_URL} className={HUB_BUTTON_SMALL}>
          <HubIcon small>
            <circle cx="8" cy="9.5" r="2.5" />
            <circle cx="16.5" cy="10.5" r="2" />
            <path d="M3.5 18c.7-2.6 2.4-3.9 4.5-3.9s3.8 1.3 4.5 3.9M14 17.5c.5-1.9 1.4-2.9 2.8-2.9s2.4 1 2.9 2.9" />
          </HubIcon>
          <HubText small title={t.home.forum} />
        </a>
      </div>

      {panel === "account" && (
        <Modal title={t.home.account} close={t.home.close} onClose={close}>
          <AuthForm lang={lang} t={t.account} heading={false} />
        </Modal>
      )}
      {panel === "book" && (
        <Modal title={t.nav.book} close={t.home.close} onClose={close}>
          <BookingForm lang={lang} t={t.book} onBooked={() => setPanel("rides")} />
        </Modal>
      )}
      {panel === "rides" && (
        <Modal title={t.nav.rides} close={t.home.close} onClose={close} wide>
          <YourRides lang={lang} t={t} />
        </Modal>
      )}
      {panel === "contact" && (
        <Modal title={t.contact.title} close={t.home.close} onClose={close} wide>
          <ContactForm lang={lang} t={t.contact} />
        </Modal>
      )}
      {panel === "rate" && (
        <Modal title={t.rate.title} close={t.home.close} onClose={close} wide>
          <RateForm lang={lang} t={t.rate} contact={t.contact} />
        </Modal>
      )}
    </div>
  );
}
