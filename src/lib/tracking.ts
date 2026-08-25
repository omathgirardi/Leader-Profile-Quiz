// UTM + click-id capture, persisted across the quiz funnel.
const KEY = "n5_tracking";

export type Tracking = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  user_agent?: string;
  referrer?: string;
};

const FIELDS: (keyof Tracking)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
];

export function captureTracking(): Tracking {
  if (typeof window === "undefined") return {};
  try {
    const existingRaw = sessionStorage.getItem(KEY);
    const existing: Tracking = existingRaw ? JSON.parse(existingRaw) : {};
    const params = new URLSearchParams(window.location.search);
    const next: Tracking = { ...existing };
    for (const f of FIELDS) {
      const v = params.get(f);
      if (v && !next[f]) next[f] = v;
    }
    if (!next.user_agent) next.user_agent = navigator.userAgent;
    if (!next.referrer) next.referrer = document.referrer || undefined;
    sessionStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}

export function getTracking(): Tracking {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
