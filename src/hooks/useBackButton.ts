// src/hooks/useBackButton.ts
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

type BackHandler = {
  key:       string;
  priority:  number;
  callback:  () => void;
  timestamp: number;
};

const _handlerStack: BackHandler[]                     = [];
let _lastBackPress                                     = 0;
let _historyCheckInterval: ReturnType<typeof setInterval> | null = null;
let _nativeListenerRegistered                          = false;
let _suppressUntil                                     = 0;
let _onRootBackPress: (() => void) | null              = null;

export function suppressBackButton(duration = 500): void {
  _suppressUntil = Date.now() + duration;
}

export function setRootBackHandler(handler: (() => void) | null): void {
  _onRootBackPress = handler;
}

function ensureHistoryEntry() {
  try {
    if (!window.history.state?.__ghaBackHandler) {
      window.history.pushState(
        { __ghaBackHandler: true, timestamp: Date.now() },
        "",
        window.location.href
      );
    }
  } catch { /* ignore */ }
}

function getTopHandler(): BackHandler | null {
  if (_handlerStack.length === 0) return null;
  return [..._handlerStack].sort((a, b) =>
    b.priority !== a.priority
      ? b.priority - a.priority
      : b.timestamp - a.timestamp
  )[0];
}

function showExitToast() {
  document.getElementById("gha-exit-toast")?.remove();

  if (!document.getElementById("gha-toast-styles")) {
    const s    = document.createElement("style");
    s.id       = "gha-toast-styles";
    s.textContent = `
      @keyframes gha-toast-fade {
        0%   { opacity:0; transform:translateX(-50%) translateY(16px) scale(.92); }
        15%  { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);   }
        75%  { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);   }
        100% { opacity:0; transform:translateX(-50%) translateY(-8px) scale(.96); }
      }`;
    document.head.appendChild(s);
  }

  const toast        = document.createElement("div");
  toast.id           = "gha-exit-toast";
  toast.textContent  = "Press back again to exit";
  toast.style.cssText = `
    position:fixed; bottom:110px; left:50%;
    transform:translateX(-50%);
    background:rgba(5,150,105,.95); color:#fff;
    padding:11px 26px; border-radius:28px;
    font-size:14px; font-weight:600;
    z-index:99999; pointer-events:none;
    animation:gha-toast-fade 2.1s ease-out forwards;
    font-family:system-ui,sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,.28);`;
  document.body.appendChild(toast);
  if (navigator.vibrate) navigator.vibrate(40);
  setTimeout(() => toast.remove(), 2200);
}

function handleBackPress(): boolean {
  if (Date.now() < _suppressUntil) return true;

  const top = getTopHandler();
  if (top) {
    try { top.callback(); } catch (e) { console.error("Back handler error:", e); }
    return true;
  }

  if (_onRootBackPress) {
    try { _onRootBackPress(); } catch { /* ignore */ }
    return true;
  }

  // Root level — double-tap exits
  const now = Date.now();
  if (now - _lastBackPress < 2000) {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app")
        .then(({ App }) => App.exitApp())
        .catch(() => { (navigator as any).app?.exitApp?.(); });
    }
    return true;
  }
  _lastBackPress = now;
  showExitToast();
  return true;
}

function handlePopState() {
  ensureHistoryEntry();
  handleBackPress();
}

function startHistoryCheck() {
  if (_historyCheckInterval) return;
  _historyCheckInterval = setInterval(ensureHistoryEntry, 500);
}

async function registerNativeBackButton() {
  if (_nativeListenerRegistered || !Capacitor.isNativePlatform()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", () => handleBackPress());
    _nativeListenerRegistered = true;
  } catch (e) {
    console.warn("Failed to register native back button:", e);
  }
}

// ── Bootstrap once on module load ────────────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("popstate", handlePopState);

  const init = () => {
    ensureHistoryEntry();
    startHistoryCheck();
    registerNativeBackButton();
  };

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ensureHistoryEntry();
      registerNativeBackButton();
    }
  });

  window.addEventListener("focus", ensureHistoryEntry);
}

// ── Main hook ─────────────────────────────────────────────────────────────────
/**
 * Register a back-button handler with a given priority.
 *
 * Only the HIGHEST-PRIORITY active handler fires when back is pressed.
 *
 * Priority guide used across AppShell:
 *   60 – search results page
 *   50 – search overlay
 *   40 – navigation page
 *   30 – property sheet
 *   21 – profile tab → listings sub-section
 *   20 – any non-map tab → go to map
 *    0 – map root → double-tap to exit (handled inside handleBackPress)
 */
export function useBackButton(
  isActive:  boolean,
  onBack:    () => void,
  screenKey: string,
  priority   = 10,
): void {
  // Keep latest callback in a ref so we never need to re-register
  const onBackRef    = useRef(onBack);
  const priorityRef  = useRef(priority);
  const isActiveRef  = useRef(isActive);

  // Always keep refs current
  useEffect(() => { onBackRef.current   = onBack;    }, [onBack]);
  useEffect(() => { priorityRef.current = priority;  }, [priority]);
  useEffect(() => { isActiveRef.current = isActive;  }, [isActive]);

  // Sync priority changes into the stack without re-registering
  useEffect(() => {
    const existing = _handlerStack.find(h => h.key === screenKey);
    if (existing) existing.priority = priority;
  }, [priority, screenKey]);

  // Register / unregister based on isActive
  useEffect(() => {
    if (!isActive) {
      // Remove from stack when inactive
      const idx = _handlerStack.findIndex(h => h.key === screenKey);
      if (idx !== -1) _handlerStack.splice(idx, 1);
      return;
    }

    // Replace any stale entry for this key
    const existingIdx = _handlerStack.findIndex(h => h.key === screenKey);
    if (existingIdx !== -1) _handlerStack.splice(existingIdx, 1);

    _handlerStack.push({
      key:       screenKey,
      priority:  priorityRef.current,
      callback:  () => { if (isActiveRef.current) onBackRef.current(); },
      timestamp: Date.now(),
    });

    ensureHistoryEntry();

    return () => {
      const idx = _handlerStack.findIndex(h => h.key === screenKey);
      if (idx !== -1) _handlerStack.splice(idx, 1);
    };
  // screenKey is the stable identity — only re-run when active state flips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, screenKey]);
}

// ── Convenience wrapper for always-mounted full-screen pages ─────────────────
export function useBackButtonPage(
  onBack:    () => void,
  screenKey: string,
  priority   = 10,
): void {
  useBackButton(true, onBack, screenKey, priority);
}