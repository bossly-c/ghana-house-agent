// src/hooks/useBackButton.ts
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
type BackHandler = {
  key:       string;
  priority:  number;
  callback:  () => void;
  timestamp: number;
};

/* ─────────────────────────────────────────────────────────────────
   Module-level state  (one instance for the whole app lifetime)
───────────────────────────────────────────────────────────────── */
const _handlerStack: BackHandler[] = [];
let _lastBackPress                 = 0;
let _suppressUntil                 = 0;
let _nativeRegistered              = false;
let _webRegistered                 = false;
let _onRootBack: (() => void) | null = null;

/* ─────────────────────────────────────────────────────────────────
   Public helpers
───────────────────────────────────────────────────────────────── */
export function suppressBackButton(duration = 500): void {
  _suppressUntil = Date.now() + duration;
}
export function setRootBackHandler(h: (() => void) | null): void {
  _onRootBack = h;
}

/* ─────────────────────────────────────────────────────────────────
   Stack helpers
───────────────────────────────────────────────────────────────── */
function getTopHandler(): BackHandler | null {
  if (_handlerStack.length === 0) return null;
  return [..._handlerStack].sort((a, b) =>
    b.priority !== a.priority
      ? b.priority - a.priority
      : b.timestamp - a.timestamp,
  )[0];
}

/* ─────────────────────────────────────────────────────────────────
   Exit toast
───────────────────────────────────────────────────────────────── */
function showExitToast() {
  document.getElementById("gha-exit-toast")?.remove();

  if (!document.getElementById("gha-toast-style")) {
    const s = document.createElement("style");
    s.id    = "gha-toast-style";
    s.textContent = `
      @keyframes gha-toast-fade {
        0%   { opacity:0; transform:translateX(-50%) translateY(16px) scale(.92); }
        15%  { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);   }
        75%  { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);   }
        100% { opacity:0; transform:translateX(-50%) translateY(-8px) scale(.96); }
      }`;
    document.head.appendChild(s);
  }

  const t = document.createElement("div");
  t.id    = "gha-exit-toast";
  t.textContent = "Press back again to exit";
  t.style.cssText = `
    position:fixed; bottom:110px; left:50%;
    transform:translateX(-50%);
    background:rgba(5,150,105,.95); color:#fff;
    padding:11px 26px; border-radius:28px;
    font-size:14px; font-weight:600;
    z-index:99999; pointer-events:none;
    animation:gha-toast-fade 2.1s ease-out forwards;
    font-family:system-ui,sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,.28);`;
  document.body.appendChild(t);
  if (navigator.vibrate) navigator.vibrate(40);
  setTimeout(() => t.remove(), 2200);
}

/* ─────────────────────────────────────────────────────────────────
   Core back-press handler
   Returns true = handled, false = let platform decide
───────────────────────────────────────────────────────────────── */
function handleBackPress(): void {
  if (Date.now() < _suppressUntil) return;

  const top = getTopHandler();
  if (top) {
    try { top.callback(); } catch (e) { console.error("Back handler error:", e); }
    return;
  }

  if (_onRootBack) {
    try { _onRootBack(); } catch { /* ignore */ }
    return;
  }

  /* Root level — double-tap exits */
  const now = Date.now();
  if (now - _lastBackPress < 2000) {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app")
        .then(({ App }) => App.exitApp())
        .catch(() => { (navigator as any).app?.exitApp?.(); });
    }
    return;
  }
  _lastBackPress = now;
  showExitToast();
}

/* ─────────────────────────────────────────────────────────────────
   Web-only: keep a dummy history entry so popstate fires on back
───────────────────────────────────────────────────────────────── */
function ensureHistoryEntry() {
  try {
    if (!window.history.state?.__gha) {
      window.history.pushState({ __gha: true, ts: Date.now() }, "", window.location.href);
    }
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────────────
   Bootstrap — runs once when the module is first imported
───────────────────────────────────────────────────────────────── */
if (typeof window !== "undefined") {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    /* ── Native (Android APK) ─────────────────────────────────────
       ONLY use the Capacitor backButton event.
       Do NOT add a popstate listener — the WebView's own history
       navigation would fire popstate a second time and cause a
       double-invocation of handleBackPress.
    ─────────────────────────────────────────────────────────────── */
    const registerNative = async () => {
      if (_nativeRegistered) return;
      try {
        const { App } = await import("@capacitor/app");
        App.addListener("backButton", () => {
          /* We always handle it ourselves — never let Capacitor's
             default exit or the WebView's history.back() fire.    */
          handleBackPress();
        });
        _nativeRegistered = true;
      } catch (e) {
        console.warn("Could not register native back button:", e);
      }
    };

    if (document.readyState === "complete") {
      registerNative();
    } else {
      window.addEventListener("load", registerNative, { once: true });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registerNative();
    });

  } else {
    /* ── Web browser ──────────────────────────────────────────────
       Use popstate (browser back button / gesture).
       Keep a dummy history entry so popstate always fires.
    ─────────────────────────────────────────────────────────────── */
    if (!_webRegistered) {
      window.addEventListener("popstate", () => {
        ensureHistoryEntry(); // repush so next press also fires
        handleBackPress();
      });
      _webRegistered = true;
    }

    const initWeb = () => {
      ensureHistoryEntry();
      setInterval(ensureHistoryEntry, 800);
    };

    if (document.readyState === "complete") {
      initWeb();
    } else {
      window.addEventListener("load", initWeb, { once: true });
    }
  }
}

/* ─────────────────────────────────────────────────────────────────
   Main hook

   Priority guide used in AppShell:
     70 – search results page
     60 – parameter search form
     50 – compact search overlay
     40 – navigation page
     30 – property sheet
     21 – profile → listings sub-section
     20 – any non-map tab → map
      0 – map root → double-tap exit (handled in handleBackPress)
───────────────────────────────────────────────────────────────── */
export function useBackButton(
  isActive:  boolean,
  onBack:    () => void,
  screenKey: string,
  priority   = 10,
): void {
  const onBackRef   = useRef(onBack);
  const isActiveRef = useRef(isActive);

  /* Always keep refs current so the stored callback is never stale */
  useEffect(() => { onBackRef.current   = onBack;   }, [onBack]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  /* Sync priority changes into existing stack entries */
  useEffect(() => {
    const existing = _handlerStack.find(h => h.key === screenKey);
    if (existing) existing.priority = priority;
  }, [priority, screenKey]);

  /* Register / unregister whenever isActive or the key changes */
  useEffect(() => {
    /* Remove any stale entry for this key first */
    const remove = () => {
      const idx = _handlerStack.findIndex(h => h.key === screenKey);
      if (idx !== -1) _handlerStack.splice(idx, 1);
    };

    if (!isActive) {
      remove();
      return;
    }

    remove(); /* clear stale entry before re-adding */

    _handlerStack.push({
      key:       screenKey,
      priority,
      /* Callback re-checks the ref at invocation time so it is
         always guarded even if React hasn't flushed a re-render */
      callback:  () => { if (isActiveRef.current) onBackRef.current(); },
      timestamp: Date.now(),
    });

    return remove; /* cleanup when isActive → false or component unmounts */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, screenKey]);
}

/* ─────────────────────────────────────────────────────────────────
   Convenience wrapper for always-mounted full-screen pages
───────────────────────────────────────────────────────────────── */
export function useBackButtonPage(
  onBack:    () => void,
  screenKey: string,
  priority   = 10,
): void {
  useBackButton(true, onBack, screenKey, priority);
}