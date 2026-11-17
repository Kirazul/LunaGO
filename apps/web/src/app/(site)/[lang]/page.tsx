import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DitherBackground } from "@/components/dither-background";
import { Home } from "@/components/site/home";
import { dict, isLang } from "@/lib/i18n";

// The customer site's home page: the same moving background as the portal, and a few large
// buttons in the middle (components/site/home.tsx).
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <div className="relative isolate flex flex-1 flex-col justify-center px-5 py-12">
      <div aria-hidden className="fixed inset-0 -z-10">
        <DitherBackground />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_min(34rem,96vw)_min(24rem,50vh)_at_50%_50%,rgb(5_5_13/0.95),rgb(5_5_13/0.78)_55%,transparent)]" />
      </div>
      <Suspense fallback={<div className="h-80" />}>
        <Home lang={lang} t={dict(lang)} />
      </Suspense>
    </div>
  );
}
