import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";

import "../globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson" });

export const metadata: Metadata = {
  title: "LunaGo and ComplaintLens",
  description:
    "The front door of the project: the LunaGo customer site (a fictional ride company) and the ComplaintLens console that reads and answers its customers' messages.",
};

// One of three root layouts (see also (site) and (console)): each part of the app needs its own
// <html>, with its own language, fonts and colours. This one is for "/", the portal: the page
// that sends visitors either to the customer site or to the staff console.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable}`}>
      <body className="bg-night-deep font-body text-paper">{children}</body>
    </html>
  );
}
