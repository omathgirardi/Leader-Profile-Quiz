// Facebook Pixel helpers
export const FB_PIXEL_ID = "25863699483292136";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function fbqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    if (params) window.fbq("track", event, params);
    else window.fbq("track", event);
  } catch {
    // ignore
  }
}
