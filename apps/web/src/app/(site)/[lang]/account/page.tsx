import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountPage } from "@/components/site/account-page";
import { dict, isLang } from "@/lib/i18n";

// The browser tab's title, in the page's language.
export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? dict(lang).account.signInTitle : undefined, robots: { index: false } };
}

export default async function SignInPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <Suspense fallback={<div className="h-80" />}>
        <AccountPage lang={lang} t={dict(lang)} />
      </Suspense>
    </div>
  );
}
