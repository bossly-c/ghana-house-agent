"use client";
import { useState, useRef } from "react";
import { X, Eye, EyeOff, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { UserPayload } from "@/lib/auth";

interface Props { onClose: () => void; }
type Mode = "login" | "signup";

export default function AuthModal({ onClose }: Props) {
  const { login }               = useAuth();
  const [mode, setMode]         = useState<Mode>("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Signup-only
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [whatsapp, setWhatsapp]   = useState("");
  const [picPreview, setPicPreview] = useState<string | null>(null);

  // Shared
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPicPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    setError("");
    if (password.length < 5) {
      setError("Password must be at least 5 characters");
      return;
    }
    setLoading(true);
    try {
      const url  = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "signup"
          ? { name, phone, whatsapp, username, password, profilePicUrl: picPreview }
          : { username, password };

      const res  = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }

     login(data.token, { ...data.user, id: Number(data.user.id) });
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inp =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
    + " focus:border-[#f2b70a] focus:ring-2 focus:ring-[#f2b70a]/20"
    + " border-[var(--border-col)] bg-[var(--surface-2)] text-[var(--text-main)]"
    + " placeholder:text-[var(--text-muted)]";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-y-auto no-scrollbar"
        style={{
          background:    "var(--surface)",
          maxHeight:     "92dvh",
          paddingBottom: "calc(var(--sab) + 1.5rem)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border-col)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-col)]">
          <h2
            className="font-display text-xl font-bold"
            style={{ color: "var(--text-main)" }}
          >
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--surface-2)]">
            <X size={20} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {mode === "signup" && (
            <>
              {/* Profile pic */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-dashed border-[var(--border-col)]"
                  style={{ background: "var(--surface-2)" }}
                  type="button"
                >
                  {picPreview
                    ? <img src={picPreview} className="w-full h-full object-cover" alt="" />
                    : <Camera size={26} style={{ color: "var(--text-muted)" }} />
                  }
                </button>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Optional profile photo
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              <input
                className={inp} placeholder="Full name"
                value={name} onChange={e => setName(e.target.value)}
              />
              <input
                className={inp} placeholder="Phone (e.g. 0244 123 456)" type="tel"
                value={phone} onChange={e => setPhone(e.target.value)}
              />
              <input
                className={inp} placeholder="WhatsApp number" type="tel"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              />
            </>
          )}

          <input
            className={inp} placeholder="Username"
            value={username} onChange={e => setUsername(e.target.value)}
            autoCapitalize="none" autoCorrect="off"
          />

          <div className="relative">
            <input
              className={inp + " pr-12"}
              placeholder="Password (min 5 characters)"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={() => setShowPass(s => !s)}
            >
              {showPass
                ? <EyeOff size={18} style={{ color: "var(--text-muted)" }} />
                : <Eye    size={18} style={{ color: "var(--text-muted)" }} />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            type="button"
            className="w-full py-3.5 rounded-xl font-extrabold text-sm transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#0c3b2e", color: "#f2b70a" }}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "Log In"
              : "Create Account"}
          </button>

          <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {mode === "login" ? "No account? " : "Already have one? "}
            <button
              type="button"
              className="font-bold underline"
              style={{ color: "#f2b70a" }}
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            >
              {mode === "login" ? "Sign up free" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}