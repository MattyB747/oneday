// Layer 9/10 capture (client side) — fire-and-forget outcome logging. An anonymous,
// stable session id ties a visitor's actions together without any account. Best-effort:
// failures are swallowed, never block the UI.
function sessionId() {
  try {
    let s = localStorage.getItem('odSession');
    if (!s) { s = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('odSession', s); }
    return s;
  } catch (_) { return 'anon'; }
}

export const captureSession = sessionId;

export function capture(kind, payload) {
  try {
    const body = JSON.stringify({ kind, session: sessionId(), payload: payload || {} });
    // sendBeacon survives navigation (e.g. tapping "open in Google Maps"); fall back to fetch.
    if (navigator.sendBeacon) navigator.sendBeacon('/api/capture', new Blob([body], { type: 'application/json' }));
    else fetch('/api/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch (_) { /* never break the UI over analytics */ }
}
