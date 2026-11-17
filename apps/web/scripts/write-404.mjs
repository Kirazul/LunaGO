// Post-build step for the static export: the "page not found" page.
//
// GitHub Pages answers every unknown address with out/404.html. Next.js writes a default one in
// English with no link back. The site has three separate root layouts (see src/app), and for
// that structure Next.js only offers an experimental way to customise it, so this script simply
// replaces the file with a small self-contained page in both languages. Its links include the
// base path ("/LunaGO" on GitHub Pages, empty locally), like every other link of the site.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../out/", import.meta.url));
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found · LunaGo</title>
<link rel="icon" href="${base}/icon.svg">
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
    background: #f5f3ff; color: #3b3a4f; font: 1.0625rem/1.6 ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 34rem; }
  p.code { margin: 0; font-weight: 700; color: #b86a07; }
  h1 { margin: 0.25rem 0 0.5rem; font-size: 2rem; line-height: 1.2; color: #1e1b4b; }
  section + section { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #c7c2f0; }
  a { display: inline-block; margin-top: 0.75rem; padding: 0.6rem 1.4rem; border-radius: 999px;
    background: #1e1b4b; color: #f5f3ff; font-weight: 600; text-decoration: none; }
  a:hover, a:focus-visible { background: #2c2870; }
  a:focus-visible { outline: 3px solid #f2a33a; outline-offset: 2px; }
</style>
</head>
<body>
<main>
  <section>
    <p class="code">404</p>
    <h1>This page does not exist</h1>
    <p>The address may be mistyped, or the page may have moved.</p>
    <a href="${base}/en/">Go to the LunaGo home page</a>
  </section>
  <section lang="fr">
    <h1>Cette page n'existe pas</h1>
    <p>L'adresse est peut-être mal saisie, ou la page a été déplacée.</p>
    <a href="${base}/fr/" hreflang="fr">Aller à l'accueil de LunaGo</a>
  </section>
</main>
</body>
</html>
`;

writeFileSync(`${OUT}404.html`, page);
mkdirSync(`${OUT}404`, { recursive: true });
writeFileSync(`${OUT}404/index.html`, page); // the same page at /404/
console.log("write-404: out/404.html replaced with the bilingual page");
