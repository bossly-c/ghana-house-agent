"use client";
import { User, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import AuthModal from "./AuthModal";
import MyListings from "./MyListings";

interface ProfileTabProps {
  onRefresh?:      () => void;
  section:         "info" | "listings";
  onSectionChange: (s: "info" | "listings") => void;
}

export default function ProfileTab({ onRefresh, section, onSectionChange }: ProfileTabProps) {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("gha_token") ?? ""
      : "";

  // ─── Not logged in ────────────────────────────────────────────────
  if (!user) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center"
        style={{ background: "var(--bg)", minHeight: "100%" }}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "var(--surface)", border: "2px solid var(--border-col)" }}
        >
          <User size={44} style={{ color: "var(--text-muted)" }} />
        </div>
        <div>
          <h2
            className="font-display text-2xl font-bold"
            style={{
              color:      "var(--text-main)",
              fontFamily: "var(--font-fraunces, Georgia, serif)",
            }}
          >
            Ghana House Agent
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Sign in to save listings, list your property, and get personalised nearby alerts.
          </p>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm"
          style={{ background: "#0c3b2e", color: "#f2b70a" }}
          type="button"
        >
          <LogIn size={18} /> Sign In / Create Account
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  // ─── Logged in ────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100%", background: "var(--bg)" }}   /* ← KEY FIX */
    >
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2 pt-7 pb-4 px-5">
        {user.avatar ? (
          <img
            src={user.avatar}
            className="w-20 h-20 rounded-full object-cover"
            style={{ border: "4px solid #f2b70a" }}
            alt="profile"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "#0c3b2e", border: "4px solid #f2b70a" }}
          >
            <span
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize:   "1.875rem",
                fontWeight: 700,
                color:      "#f2b70a",
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h2
          className="text-xl font-bold"
          style={{
            color:      "var(--text-main)",
            fontFamily: "var(--font-fraunces, Georgia, serif)",
          }}
        >
          {user.name}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          @{user.username}
        </p>
      </div>

      {/* Segment control */}
      <div
        className="flex mx-5 mb-4 rounded-2xl overflow-hidden border"
        style={{
          borderColor: "var(--border-col)",
          background:  "var(--surface-2)",
        }}
      >
        {(["info", "listings"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSectionChange(s)}
            className="flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wide transition"
            style={{
              background:   section === s ? "#0c3b2e" : "transparent",
              color:        section === s ? "#f2b70a" : "var(--text-muted)",
              borderRadius: "0.875rem",
            }}
          >
            {s === "info" ? "My Info" : "My Listings"}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 pb-10 overflow-y-auto thin-scroll">
        {section === "info" && (
          <div className="space-y-3">
            {[
              { label: "Phone",    value: user.phone    ?? "—" },
              { label: "WhatsApp", value: user.whatsapp ?? "—" },
              { label: "Username", value: `@${user.username}` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl px-5 py-4 flex justify-between items-center"
                style={{
                  background: "var(--surface)",
                  border:     "1px solid var(--border-col)",
                }}
              >
                <span
                  className="text-xs font-extrabold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </span>
                <span className="font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                  {value}
                </span>
              </div>
            ))}

            <button
              onClick={logout}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm mt-2"
              style={{ background: "#fee2e220", color: "#dc2626", border: "1px solid #dc262630" }}
            >
              <LogOut size={18} /> Log Out
            </button>
          </div>
        )}

        {section === "listings" && (
          <MyListings token={token} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}