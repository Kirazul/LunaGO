import { DitherBackground } from "@/components/dither-background";
import { Doors } from "@/components/portal/doors";
import { GUIDE_URL } from "@/lib/config";

// "/": the portal. A title and two buttons in the middle of the screen (the customer site, the
// admin console), over a moving field of dots. A darker patch behind the middle keeps the text
// readable over the dots.
export default function Portal() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <DitherBackground />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_min(38rem,96vw)_min(25rem,48vh)_at_50%_48%,rgb(5_5_13/0.95),rgb(5_5_13/0.78)_55%,transparent)]"
      />

      <div className="portal-in relative flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <h1 className="text-balance font-display text-[clamp(2rem,5.4vw,3.25rem)] font-extrabold leading-[1.08] tracking-tight text-amber">
          One ride app. Two ways in.
        </h1>
        <p className="mx-auto mt-4 max-w-[30rem] text-pretty leading-relaxed text-paper/80">
          A fictional ride app, and the AI support desk built for it.
        </p>
        <div className="mt-9 w-full">
          <Doors />
        </div>
      </div>

      <footer className="relative flex justify-center px-5 pb-6">
        <p className="rounded-2xl border border-lilac/20 bg-[#0c0b1a]/95 px-5 py-2.5 text-center text-sm text-paper">
          NLP semester project 2026–2027, by Mohamed Aziz Mansour and Rimel Zouari.{" "}
          <a href={GUIDE_URL} className="font-semibold text-amber underline underline-offset-4 hover:text-paper">
            How the system works
          </a>
        </p>
      </footer>
    </main>
  );
}
