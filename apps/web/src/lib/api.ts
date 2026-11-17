// The HTTP client for the ComplaintLens API (FastAPI, see src/complaintlens/api/): one function
// per endpoint in `api`, plus the reader of live events.

import { API_URL } from "./config";
import type { Lang } from "./i18n";
import { account, session } from "./session";
import type {
  Account,
  Agreement,
  AnnotationItem,
  AnnotationProgress,
  ExperimentRow,
  GoldLabels,
  HelpArticle,
  Insights,
  Member,
  MyConversation,
  PublicTicket,
  Quote,
  Ride,
  Session,
  Stats,
  TicketDetail,
  TicketSummary,
  User,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Who = "staff" | "customer" | null;

async function request<T>(path: string, init?: RequestInit, who: Who = null): Promise<T> {
  const store = who === "staff" ? session : who === "customer" ? account : null;
  const token = store?.get()?.token;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: unknown };
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? "");
    } catch {
      // not JSON
    }
    // An expired or revoked session: back to the sign-in screen.
    if (res.status === 401 && token) store?.set(null);
    throw new ApiError(res.status, detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown, who: Who = null) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) }, who);
const staff = <T>(path: string, init?: RequestInit) => request<T>(path, init, "staff");
const staffPost = <T>(path: string, body: unknown) => post<T>(path, body, "staff");
const mine = <T>(path: string) => request<T>(path, undefined, "customer");
const minePost = <T>(path: string, body: unknown) => post<T>(path, body, "customer");

export const api = {
  // anyone
  submit: (payload: {
    email: string;
    name?: string;
    subject?: string;
    body: string;
    channel?: "web" | "chat" | "review";
    ride?: string;
  }) => post<{ id: number; number: string; track_key: string }>("/api/messages", payload),
  publicTicket: (id: number, key: string) =>
    request<PublicTicket>(`/api/public/tickets/${id}?k=${encodeURIComponent(key)}`),
  followUp: (id: number, key: string, body: string) =>
    post<{ accepted: boolean }>(`/api/public/tickets/${id}/messages`, { k: key, body }),
  places: () => request<string[]>("/api/rides/places"),
  quote: (pickup: string, dropoff: string) => post<Quote>("/api/rides/quote", { pickup, dropoff }),

  // customer accounts (website)
  signup: (email: string, name: string, password: string, lang: Lang) =>
    post<Account>("/api/account/signup", { email, name, password, lang }),
  signin: (email: string, password: string) => post<Account>("/api/account/signin", { email, password }),
  signout: () => minePost<{ signed_out: boolean }>("/api/account/signout", {}),
  myRides: () => mine<Ride[]>("/api/account/rides"),
  book: (pickup: string, dropoff: string, at: string) => minePost<Ride>("/api/account/rides", { pickup, dropoff, at }),
  cancelRide: (id: string) => minePost<Ride>(`/api/account/rides/${id}/cancel`, {}),
  myConversations: () => mine<MyConversation[]>("/api/account/conversations"),

  // staff sign-in
  login: (username: string, password: string) => post<Session>("/api/auth/login", { username, password }),
  logout: () => staffPost<{ signed_out: boolean }>("/api/auth/logout", {}),
  me: () => staff<User>("/api/auth/me"),
  changePassword: (current: string, next: string) =>
    staffPost<{ token: string }>("/api/auth/password", { current, new: next }),

  // team (administrators)
  users: () => staff<Member[]>("/api/users"),
  addUser: (user: { username: string; name: string; password: string; role: "agent" | "admin" }) =>
    staffPost<Member>("/api/users", user),
  resetPassword: (id: number, password: string) => staffPost<{ reset: boolean }>(`/api/users/${id}/password`, { password }),
  removeUser: (id: number) => staff<{ removed: boolean }>(`/api/users/${id}`, { method: "DELETE" }),

  // inbox and conversations
  stats: () => staff<Stats>("/api/stats"),
  tickets: () => staff<TicketSummary[]>("/api/tickets"),
  ticket: (id: number) => staff<TicketDetail>(`/api/tickets/${id}`),
  reply: (id: number, body: string) =>
    staffPost<{ status: string; error: string | null }>(`/api/tickets/${id}/reply`, { body }),
  setResolved: (id: number, resolved: boolean) => staffPost<{ status: string }>(`/api/tickets/${id}/status`, { resolved }),
  knowledge: (lang: Lang) => staff<HelpArticle[]>(`/api/knowledge?lang=${lang}`),

  // research
  insights: () => staff<Insights>("/api/insights"),
  experiments: () => staff<ExperimentRow[]>("/api/experiments"),
  annotateNext: (set: string) =>
    staff<{ item: AnnotationItem | null; progress: AnnotationProgress }>(`/api/annotate/next?set=${set}`),
  annotateSave: (item_id: string, labels: GoldLabels) =>
    staffPost<{ saved: boolean; progress: AnnotationProgress }>("/api/annotate", { item_id, labels }),
  annotateAddItem: (text: string, lang: "en" | "fr") => staffPost<AnnotationItem>("/api/annotate/items", { text, lang }),
  agreement: (set: string) => staff<Agreement>(`/api/annotate/agreement?set=${set}`),
};

/**
 * Live events (Server-Sent Events) read with fetch, so the session token goes in a header and
 * never in a URL. Resolves when the stream ends or `signal` aborts; throws on HTTP errors.
 */
export async function readEvents(
  onEvent: (event: Record<string, unknown>) => void,
  onOpen: () => void,
  signal: AbortSignal,
): Promise<void> {
  const token = session.get()?.token;
  const res = await fetch(`${API_URL}/api/events`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });
  if (!res.ok || !res.body) {
    if (res.status === 401 && token) session.set(null);
    throw new ApiError(res.status, res.statusText);
  }
  onOpen();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data) continue; // a comment (keep-alive)
      try {
        onEvent(JSON.parse(data) as Record<string, unknown>);
      } catch {
        // ignore a malformed event
      }
    }
  }
}
