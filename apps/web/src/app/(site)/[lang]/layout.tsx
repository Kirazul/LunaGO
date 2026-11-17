import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LunaGoLogo } from "@/components/brand";
import { AccountButton } from "@/components/site/account";
import { ChatWidget } from "@/components/site/chat-widget";
import { LangSwitch } from "@/components/site/lang-switch";
import { dict, isLang, LANGS } from "@/lib/i18n";
import "../../globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson" });

export const metadata: Metadata = {
  title: { default: "LunaGo", template: "%s · LunaGo" },
  description: "Fictional ride company for a university NLP project (ComplaintLens).",
};

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

// Root layout of the LunaGo website (one of three, with (root) and (console)): <html lang> follows
// the language in the address, and every page gets the top bar, the footer and the chat. The
// class "site" on <body> switches on the dark theme (see globals.css).
export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  return (
    <html lang={lang} className={`${bricolage.variable} ${atkinson.variable}`}>
      <body className="site flex min-h-dvh flex-col bg-paper font-body text-slate">
        <header className="relative z-10 border-b border-lilac bg-paper/85 backdrop-blur-md">
          <nav aria-label={t.nav.label} className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
            <Link href={`/${lang}`} aria-label="LunaGo" className="mr-auto">
              <LunaGoLogo />
            </Link>
            <Suspense fallback={null}>
              <LangSwitch current={lang} label={t.nav.switch} />
            </Suspense>
            <AccountButton lang={lang} t={t.nav} />
          </nav>
        </header>
        <main className="relative flex flex-1 flex-col">{children}</main>
        {/* The one sentence every page must carry: the company is not real. */}
        <footer className="relative z-10 flex justify-center px-5 pb-24 pt-6">
          <p className="rounded-2xl border border-lilac bg-white px-5 py-2.5 text-center text-sm text-slate">
            {t.footer}{" "}
            <Link href="/" className="font-semibold text-amber underline underline-offset-4 hover:text-night">
              {t.home.portal}
            </Link>
          </p>
        </footer>
        <Suspense fallback={null}>
          <ChatWidget lang={lang} t={t} />
        </Suspense>
      </body>
    </html>
  );
}
