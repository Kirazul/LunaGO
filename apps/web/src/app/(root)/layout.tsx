import "../globals.css";

export const metadata = { title: "LunaGo" };

// One of three root layouts (see also (site) and (console)): each part of the app needs its own
// <html>, with its own language, fonts and colours. This one is for "/", which only forwards
// visitors to their language.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-night">{children}</body>
    </html>
  );
}
