"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Sun, Moon, Monitor, MessageCircle } from "lucide-react";
import { useTheme, type AppTheme } from "@/context/ThemeContext";

export default function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    setNotifEnabled(localStorage.getItem("gha_notif") === "true");
  }, []);

  const toggleNotif = async () => {
    if (!notifEnabled) {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
      } catch {
        // Running in browser — skip
      }
    }
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem("gha_notif", String(next));
  };

  const openSupport = () => {
    const msg = encodeURIComponent("Hello, I need support with Ghana House Agent.");
    window.open(`https://wa.me/233247659532?text=${msg}`, "_blank");
  };

  const themeOpts: { value: AppTheme; label: string; icon: typeof Sun }[] = [
    { value: "light",  label: "Light",          icon: Sun     },
    { value: "dark",   label: "Dark",           icon: Moon    },
    { value: "system", label: "Follow system",  icon: Monitor },
  ];

  const card: React.CSSProperties = {
    background: "var(--surface)",
    border:     "1px solid var(--border-col)",
    borderRadius: "1rem",
    overflow:   "hidden",
    marginBottom: "1.25rem",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize:      "11px",
    fontWeight:    800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color:         "var(--text-muted)",
    padding:       "0 4px",
    marginBottom:  "8px",
    display:       "block",
  };

  return (
    // ← KEY FIX: var(--bg) as root background
    <div
      className="flex-1 overflow-y-auto thin-scroll px-4 pb-10"
      style={{ background: "var(--bg)", minHeight: "100%" }}
    >
      <h1
        className="font-display text-2xl font-bold mb-6 px-1 pt-2"
        style={{
          color:      "var(--text-main)",
          fontFamily: "var(--font-fraunces, Georgia, serif)",
        }}
      >
        Settings
      </h1>

      {/* ── Notifications ────────────────────────── */}
      <span style={sectionLabel}>Notifications</span>
      <div style={card}>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {notifEnabled
              ? <Bell    size={20} style={{ color: "#f2b70a" }} />
              : <BellOff size={20} style={{ color: "var(--text-muted)" }} />
            }
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                Nearby property alerts
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Notify when within 300 m of a listing
              </p>
            </div>
          </div>
          <button
            onClick={toggleNotif}
            type="button"
            className="relative w-12 h-6 rounded-full transition-colors duration-200"
            style={{ background: notifEnabled ? "#0c3b2e" : "var(--border-col)" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all duration-200"
              style={{
                background: notifEnabled ? "#f2b70a" : "var(--surface-2)",
                left:       notifEnabled ? "26px"    : "2px",
              }}
            />
          </button>
        </div>
      </div>

      {/* ── Appearance ───────────────────────────── */}
      <span style={sectionLabel}>Appearance</span>
      <div style={card}>
        {themeOpts.map(({ value, label, icon: Icon }, i) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            type="button"
            className="w-full flex items-center justify-between px-5 py-4 text-left transition"
            style={{
              borderBottom:
                i < themeOpts.length - 1
                  ? "1px solid var(--border-col)"
                  : undefined,
              background:
                theme === value ? "var(--surface-2)" : "transparent",
            }}
          >
            <div className="flex items-center gap-3">
              <Icon
                size={18}
                style={{ color: theme === value ? "#f2b70a" : "var(--text-muted)" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--text-main)" }}>
                {label}
              </span>
            </div>
            {theme === value && (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: "#f2b70a" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Support ──────────────────────────────── */}
      <span style={sectionLabel}>Support</span>
      <div style={card}>
        <button
          onClick={openSupport}
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Contact Support
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Chat with us on WhatsApp
            </p>
          </div>
          <MessageCircle size={20} style={{ color: "#25d366" }} />
        </button>
      </div>

      {/* ── About ────────────────────────────────── */}
      <div style={card}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm font-medium" style={{ color: "var(--text-main)" }}>
            Version
          </span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>1.0.0</span>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────── */}
      <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        Brought to you by{" "}
        <span className="font-bold" style={{ color: "#f2b70a" }}>Bossly Co.</span>
      </p>
      <p className="text-center text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        Ghana House Agent · All rights reserved
      </p>
    </div>
  );
}