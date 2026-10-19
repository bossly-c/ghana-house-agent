"use client";
import { useState } from "react";
import { User, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "./AuthModal";
import MyListings from "./MyListings";

interface ProfileTabProps {
  onRefresh?: () => void;
}

export default function ProfileTab({ onRefresh }: ProfileTabProps) {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [section,  setSection]  = useState<"info" | "listings">("info");

  // Read token from localStorage for API calls
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("gha_token") ?? ""
      : "";

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "#0c3b2e20" }}
        >
          <User size={44} style={{ color: "#0c3b2e" }} />
        </div>
        <div>
          <h2
            className="font-display text-2xl font-bold"
            style={{ color: "var(--text-main)" }}
          >
            Ghana House Agent
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Sign in to save listings, list your property, and get personalised
            nearby alerts.
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2 pt-7 pb-4 px-5">
        {user.avatar ? (
          <img
            src={user.avatar}
            className="w-20 h-20 rounded-full object-cover border-4 border-[#f2b70a]"
            alt="profile"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-[#f2b70a]"
            style={{ background: "#0c3b2e" }}
          >
            <span className="font-display text-3xl font-bold" style={{ color: "#f2b70a" }}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h2
          className="font-display text-xl font-bold"
          style={{ color: "var(--text-main)" }}
        >
          {user.name}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          @{user.username}
        </p>
      </div>

      {/* Segment control */}
      <div className="flex mx-5 mb-4 rounded-2xl overflow-hidden border"
        style={{ borderColor: "var(--border-col)", background: "var(--surface-2)" }}>
        {(["info", "listings"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className="flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wide transition"
            style={{
              background: section === s ? "#0c3b2e" : "transparent",
              color:      section === s ? "#f2b70a"  : "var(--text-muted)",
              borderRadius: "0.875rem",
            }}
          >
            {s === "info" ? "My Info" : "My Listings"}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto thin-scroll px-5 pb-10">
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
              style={{ background: "#fee2e2", color: "#dc2626" }}
            >
              <LogOut size={18} /> Log Out
            </button>
          </div>
        )}

        {section === "listings" && <MyListings token={token} onRefresh={onRefresh} />}
      </div>
    </div>
  );
}