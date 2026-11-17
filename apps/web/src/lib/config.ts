// Addresses the app talks to. Each can be changed at build time with a NEXT_PUBLIC_ environment
// variable; the defaults suit a local run.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "lunagocare@agentmail.to";
export const FORUM_URL =
  process.env.NEXT_PUBLIC_FORUM_URL ?? "https://github.com/Kirazul/LunaGO/discussions";
// The plain-language explanation of the whole project, linked from the portal.
export const GUIDE_URL = "https://github.com/Kirazul/LunaGO/blob/main/docs/guide.md";
