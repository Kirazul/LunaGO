import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RateForm } from "@/components/site/rate-form";
import { dict, isLang } from "@/lib/i18n";

// The browser tab's title, in the page's language.
export async function generateMetadata({ params }: PageProps<"/[lang]/rate">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? dict(lang).rate.title : undefined };
}

export default async function RatePage({ params }: PageProps<"/[lang]/rate">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-night">{t.rate.title}</h1>
      <div className="mt-10">
        <Suspense fallback={<div className="h-96" />}>
          <RateForm lang={lang} t={t.rate} contact={t.contact} />
        </Suspense>
      </div>
    </div>
  );
}
