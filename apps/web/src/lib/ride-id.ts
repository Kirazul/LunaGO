// Ride IDs, as printed in Your rides: "LG-" and 4 to 6 digits.

export const RIDE_ID = /^LG-\d{4,6}$/;

/** Normalise what a customer types ("lg 12345", "LG12345") to "LG-12345". */
export function normaliseRideId(value: string): string {
  const digits = value.replace(/^\s*lg[\s-]*/i, "").trim();
  return value.trim() ? `LG-${digits}` : "";
}
