import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BookingForm } from "@/components/site/booking-form";
import { dict, isLang } from "@/lib/i18n";

// The browser tab's title, in the page's language.
export async function generateMetadata({ params }: PageProps<"/[lang]/book">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? dict(lang).book.title : undefined };
}

export default async function BookPage({ params }: PageProps<"/[lang]/book">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-night">{t.book.title}</h1>
      <div className="mt-10">
        <Suspense fallback={<div className="h-80" />}>
          <BookingForm lang={lang} t={t.book} />
        </Suspense>
      </div>
    </div>
  );
}
