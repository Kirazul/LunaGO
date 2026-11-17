// The shapes of the data the ComplaintLens API sends and receives (see src/complaintlens/api/).
// Types only: nothing here runs in the browser.

export type Channel = "email" | "web" | "chat" | "review" | "forum";
type TicketStatus =
  | "processing"
  | "auto_send"
  | "awaiting_approval"
  | "escalated"
  | "no_reply"
  | "answered"
  | "needs_info"
  | "closed";

export interface TicketSummary {
  id: number;
  number: string;
  channel: Channel;
  sender: string;
  sender_name: string | null;
  subject: string | null;
  status: TicketStatus;
  team: string | null;
  priority: number | null;
  language: string | null;
  received_at: string;
  updated_at: string;
  messages: number;
  message_type: string | null;
  categories: string[];
  risk_flags: string[];
  summary: string | null;
  total_ms: number | null;
}

export interface StageRecord {
  id: number;
  seq: number;
  name: string;
  status: "ok" | "skipped" | "error";
  output: Record<string, unknown>;
  confidence: number | null;
  ms: number;
  note: string | null;
}

type ReplyKind = "answer" | "acknowledgement" | "escalation" | "question";

/** One message of a conversation, as the console sees it. */
export interface ThreadItem {
  from: "customer" | "lunago";
  body: string;
  at: string;
  kind?: ReplyKind;
  author?: string | null; // the agent who sent it; null = sent automatically
  id?: number;
  status?: "queued" | "sent" | "failed";
  error?: string | null;
  citations?: string[];
}

interface Draft {
  id: number;
  body: string;
  citations: string[];
  verification: Record<string, unknown>;
}

interface Decision {
  action: string;
  reasons: string[];
  team: string;
  priority: number;
  priority_parts: Record<string, number>;
}

export interface TicketDetail extends TicketSummary {
  body: string;
  analysis: Record<string, unknown> | null;
  decision: Decision | null;
  stages: StageRecord[];
  thread: ThreadItem[];
  draft: Draft | null;
  customer: { id: number; name: string; contact: string } | null;
  trip: Record<string, unknown> | null;
}

export interface PublicTicket {
  number: string;
  status: TicketStatus;
  language: string | null;
  received_at: string;
  phases: { name: "received" | "understood" | "routed" | "answered"; done: boolean }[];
  messages: { from: "customer" | "lunago"; body: string; at: string; kind?: ReplyKind; author?: string | null }[];
}

export interface HelpArticle {
  id: string;
  title: string;
  sections: { id: string; heading: string; text: string }[];
}

export interface Stats {
  tickets: number;
  by_status: Record<string, number>;
  by_team: Record<string, number>;
  by_language: Record<string, number>;
  avg_processing_ms: number;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: "agent" | "admin";
}

export interface Member extends User {
  created_at: string;
}

interface Incident {
  terms: string[];
  messages: number;
  z: number;
}

export interface Insights {
  source: string;
  zscore_threshold: number;
  timeline: { day: string; messages: number; incidents: Incident[] }[];
  clusters: { id: number; size: number; words: string[]; examples: string[] }[];
}

export interface ExperimentRow {
  question: string;
  claim: string;
  value: string;
  source: string;
}

export interface AnnotationItem {
  id: string;
  set: string;
  lang: string;
  text: string;
  meta: Record<string, unknown>;
}

export interface GoldLabels {
  message_type: string;
  response_required: boolean;
  urgency: string | null;
  categories: string[];
  severity: number | null;
  risk_flags: string[];
  note?: string | null;
}

export interface AnnotationProgress {
  items: Record<string, number>;
  labelled: Record<string, Record<string, number>>;
}

export interface Agreement {
  set: string;
  double_labelled_items: number;
  fields: Record<string, { kappa?: number | null; kappa_quadratic?: number | null; agreement: number }>;
}

/** A member of staff signed in to the console. */
export interface Session {
  token: string;
  user: User;
}

/** A customer signed in on the LunaGo website. */
export interface Account {
  token: string;
  customer: { email: string; name: string; language: string };
}

type RideState = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Ride {
  id: string;
  state: RideState;
  started_at: string;
  pickup: string;
  dropoff: string;
  driver: string;
  vehicle: string;
  distance_km: number | null;
  upfront_price: number;
  total: number | null;
  card: string;
  charges: { amount: number; pending: boolean }[];
}

export interface Quote {
  distance_km: number;
  duration_min: number;
  price: number;
}

export interface MyConversation {
  id: number;
  number: string;
  key: string;
  status: TicketStatus;
  channel: Channel;
  received_at: string;
  preview: string;
}
