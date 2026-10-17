"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Loader2, Send } from "lucide-react";

interface BookingFormProps {
  propertyId:  string;
  viewingDays: string[];
  viewingTime: string;
  listingType: "rent" | "sale";
  onSuccess?:  () => void;   // ✅ added
}

export default function BookingForm({
  propertyId,
  viewingDays,
  viewingTime,
  listingType,
  onSuccess,               // ✅ added
}: BookingFormProps) {
  const [day,   setDay]   = useState<string | null>(null);
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [note,  setNote]  = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const canSubmit = !!day && name.trim().length >= 2 && phone.trim().length >= 9;

  async function submit() {
    if (!canSubmit || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/viewings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          name:  name.trim(),
          phone: phone.trim(),
          day,
          note:  note.trim() || undefined,
        }),
      });
      if (res.ok) {
        setState("done");
        onSuccess?.();   // ✅ notify parent so overlay closes
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="font-display text-lg font-semibold text-emerald-900">
          Viewing booked for {day}
        </p>
        <p className="text-sm text-emerald-600">
          The agent will call <strong>{phone}</strong> shortly to confirm your
          visit. Keep your phone close.
        </p>
      </div>
    );
  }

  const accent = listingType === "rent" ? "bg-red-500" : "bg-emerald-600";

  return (
    <div className="space-y-4">
      {/* Day picker */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <CalendarDays className="h-4 w-4" />
          Pick a day set by the owner
        </p>
        <div className="flex flex-wrap gap-2">
          {viewingDays.length === 0 && (
            <p className="text-sm text-zinc-400">
              Owner has not set viewing days yet — call to arrange.
            </p>
          )}
          {viewingDays.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
                day === d
                  ? `${accent} text-white shadow-md`
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-zinc-400">
          <Clock className="h-3.5 w-3.5" /> Viewing hours: {viewingTime}
        </p>
      </div>

      {/* Contact inputs */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (e.g. 024 123 4567)"
          inputMode="tel"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything the agent should know? (optional)"
        rows={2}
        className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

      {state === "error" && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-500">
          Something went wrong — please try again or call the agent directly.
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || state === "sending"}
        className={`flex w-full items-center justify-center gap-2 rounded-xl ${accent} py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:opacity-40`}
      >
        {state === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending request…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Book a viewing
          </>
        )}
      </button>
    </div>
  );
}