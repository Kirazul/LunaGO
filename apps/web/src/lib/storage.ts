"use client";

import { useSyncExternalStore } from "react";

// Small values remembered in this browser (localStorage), readable from React without a
// hydration mismatch: the server render and the first client render both see `null`.

const listeners = new Set<() => void>();
const parsed = new Map<string, { raw: string | null; value: unknown }>();
// Values the browser refused to store (private mode, storage full): kept until the tab is closed.
const unsaved = new Map<string, string | null>();

export function recall<T>(key: string): T | null {
  let raw: string | null = null;
  if (unsaved.has(key)) {
    raw = unsaved.get(key) ?? null;
  } else {
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // storage unavailable (private mode): nothing remembered
    }
  }
  const hit = parsed.get(key);
  if (hit && hit.raw === raw) return hit.value as T | null; // same snapshot, same object
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    value = null;
  }
  parsed.set(key, { raw, value });
  return value;
}

export function remember(key: string, value: unknown) {
  const raw = value == null ? null : JSON.stringify(value);
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
    unsaved.delete(key);
  } catch {
    unsaved.set(key, raw); // not stored: remembered for this tab only
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener); // other tabs
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useRemembered<T>(key: string): T | null {
  return useSyncExternalStore(
    subscribe,
    () => recall<T>(key),
    () => null,
  );
}
