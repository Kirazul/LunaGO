// Who is signed in, kept in this browser only (localStorage, see storage.ts): the staff session
// of the console and the customer account of the website. Signing out in one tab signs out the
// others.

import { recall, remember, subscribe } from "./storage";
import type { Account, Session } from "./types";

function stored<T>(key: string) {
  return {
    get: (): T | null => recall<T>(key),
    set: (next: T | null) => remember(key, next),
    subscribe,
  };
}

/** Staff signed in to the console. */
export const session = stored<Session>("complaintlens.session");
/** A customer signed in to the website (a different account type, never mixed with staff). */
export const account = stored<Account>("lunago.account");
