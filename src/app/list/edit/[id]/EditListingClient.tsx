"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface PropertyData {
  id:           string;
  title:        string;
  listingType:  string;
  propertyType: string;
  price:        number;
  pricePeriod:  string;
  region:       string;
  city:         string;
  area:         string;
  address:      string;
  description:  string;
  bedrooms:     number;
  bathrooms:    number;
  halls:        number;
  isVisible:    boolean;
  viewingDays:  string[];
  viewingTime:  string;
}

const REGIONS = [
  "Greater Accra","Ashanti","Western","Central","Eastern",
  "Northern","Upper East","Upper West","Volta","Brong-Ahafo",
  "Bono","Bono East","Ahafo","Savannah","North East","Oti",
  "Western North","Tema",
];

const PROPERTY_TYPES = [
  "House","Apartment","Studio","Room","Chamber & Hall",
  "Townhouse","Villa","Office","Shop","Land","Warehouse","Other",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function EditListingClient() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const { user }  = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const [form, setForm] = useState<PropertyData>({
    id:           "",
    title:        "",
    listingType:  "rent",
    propertyType: "House",
    price:        0,
    pricePeriod:  "month",
    region:       "Greater Accra",
    city:         "",
    area:         "",
    address:      "",
    description:  "",
    bedrooms:     0,
    bathrooms:    0,
    halls:        0,
    isVisible:    true,
    viewingDays:  [],
    viewingTime:  "9:00 AM - 4:00 PM",
  });

  /* ── Load existing property ── */
  useEffect(() => {
    if (!id) return;
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.property) {
          const p = data.property;
          setForm({
            id:           p.id,
            title:        p.title        ?? "",
            listingType:  p.listingType  ?? "rent",
            propertyType: p.propertyType ?? "House",
            price:        p.price        ?? 0,
            pricePeriod:  p.pricePeriod  ?? "month",
            region:       p.region       ?? "Greater Accra",
            city:         p.city         ?? "",
            area:         p.area         ?? "",
            address:      p.address      ?? "",
            description:  p.description  ?? "",
            bedrooms:     p.bedrooms     ?? 0,
            bathrooms:    p.bathrooms    ?? 0,
            halls:        p.halls        ?? 0,
            isVisible:    p.isVisible    ?? true,
            viewingDays:  p.viewingDays  ?? [],
            viewingTime:  p.viewingTime  ?? "9:00 AM - 4:00 PM",
          });
        } else {
          setError("Property not found");
        }
      })
      .catch(() => setError("Failed to load property"))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field: keyof PropertyData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      viewingDays: prev.viewingDays.includes(day)
        ? prev.viewingDays.filter((d) => d !== day)
        : [...prev.viewingDays, day],
    }));
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");

    const token = localStorage.getItem("gha_token");
    if (!token) { setError("Not signed in"); setSaving(false); return; }

    try {
      const res = await fetch(`/api/properties/${id}/edit`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:        form.title,
          listingType:  form.listingType,
          propertyType: form.propertyType,
          price:        Number(form.price),
          pricePeriod:  form.pricePeriod,
          region:       form.region,
          city:         form.city,
          area:         form.area,
          address:      form.address,
          description:  form.description,
          bedrooms:     Number(form.bedrooms),
          bathrooms:    Number(form.bathrooms),
          halls:        Number(form.halls),
          isVisible:    form.isVisible,
          viewingDays:  form.viewingDays,
          viewingTime:  form.viewingTime,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.back(), 1200);
      } else {
        setError(data.error ?? "Save failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  /* ── UI ── */
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !form.id) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-950 px-8">
        <p className="text-red-500 text-center">{error}</p>
        <button onClick={() => router.back()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950"
      style={{ paddingTop: "env(safe-area-inset-top)" }}>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 font-bold text-lg text-zinc-900 dark:text-white"
          style={{ fontFamily: "var(--font-fraunces, Georgia, serif)" }}>
          Edit Listing
        </h1>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition"
          style={{ background: success ? "#16a34a" : "#059669" }}
        >
          {saving
            ? <Loader2 size={15} className="animate-spin" />
            : success
              ? "✓ Saved!"
              : <><Save size={15} /> Save</>
          }
        </button>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Listing type */}
        <Section label="Listing Type">
          <div className="flex gap-3">
            {(["rent","sale"] as const).map((t) => (
              <button key={t}
                onClick={() => set("listingType", t)}
                className="flex-1 py-3 rounded-xl font-bold text-sm border-2 transition"
                style={{
                  background:   form.listingType === t ? (t === "rent" ? "#dc2626" : "#16a34a") : "transparent",
                  borderColor:  form.listingType === t ? (t === "rent" ? "#dc2626" : "#16a34a") : "#e4e4e7",
                  color:        form.listingType === t ? "#fff" : "#3f3f46",
                }}
              >
                {t === "rent" ? "🔴 For Rent" : "🟢 For Sale"}
              </button>
            ))}
          </div>
        </Section>

        {/* Title */}
        <Section label="Title">
          <input className="input" value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. 3 Bedroom House in East Legon" />
        </Section>

        {/* Property type */}
        <Section label="Property Type">
          <select className="input" value={form.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}>
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Section>

        {/* Price */}
        <Section label="Price (GH₵)">
          <div className="flex gap-3">
            <input className="input flex-1" type="number" min={0} value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="e.g. 2500" />
            {form.listingType === "rent" && (
              <select className="input w-32" value={form.pricePeriod}
                onChange={(e) => set("pricePeriod", e.target.value)}>
                {["day","week","month","year"].map((p) => (
                  <option key={p} value={p}>per {p}</option>
                ))}
              </select>
            )}
          </div>
        </Section>

        {/* Location */}
        <Section label="Location">
          <select className="input mb-2" value={form.region}
            onChange={(e) => set("region", e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input className="input mb-2" value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="City / Town" />
          <input className="input mb-2" value={form.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="Area / Neighbourhood" />
          <input className="input" value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Street address (optional)" />
        </Section>

        {/* Rooms */}
        <Section label="Rooms">
          <div className="flex gap-3">
            {([
              { label: "Beds",  field: "bedrooms"  },
              { label: "Baths", field: "bathrooms" },
              { label: "Halls", field: "halls"     },
            ] as const).map(({ label, field }) => (
              <div key={field} className="flex-1">
                <p className="label-sm mb-1">{label}</p>
                <input className="input text-center" type="number" min={0}
                  value={form[field]}
                  onChange={(e) => set(field, e.target.value)} />
              </div>
            ))}
          </div>
        </Section>

        {/* Description */}
        <Section label="Description">
          <textarea className="input min-h-[100px] resize-none" value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the property…" />
        </Section>

        {/* Viewing days */}
        <Section label="Available Viewing Days">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button key={day}
                onClick={() => toggleDay(day)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition"
                style={{
                  background:  form.viewingDays.includes(day) ? "#059669" : "transparent",
                  borderColor: form.viewingDays.includes(day) ? "#059669" : "#e4e4e7",
                  color:       form.viewingDays.includes(day) ? "#fff"    : "#3f3f46",
                }}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </Section>

        {/* Viewing time */}
        <Section label="Viewing Time">
          <input className="input" value={form.viewingTime}
            onChange={(e) => set("viewingTime", e.target.value)}
            placeholder="e.g. 9:00 AM - 4:00 PM" />
        </Section>

        {/* Visibility */}
        <Section label="Map Visibility">
          <button
            onClick={() => set("isVisible", !form.isVisible)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition"
            style={{
              borderColor: form.isVisible ? "#059669" : "#e4e4e7",
              background:  form.isVisible ? "#f0fdf4" : "#fafafa",
            }}
          >
            <div className="w-10 h-6 rounded-full transition relative"
              style={{ background: form.isVisible ? "#059669" : "#d4d4d8" }}>
              <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: form.isVisible ? "22px" : "4px" }} />
            </div>
            <span className="text-sm font-semibold"
              style={{ color: form.isVisible ? "#059669" : "#71717a" }}>
              {form.isVisible ? "Visible on map" : "Hidden from map"}
            </span>
          </button>
        </Section>

        {/* Save button (bottom) */}
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition"
          style={{ background: success ? "#16a34a" : "#059669" }}
        >
          {saving
            ? "Saving…"
            : success
              ? "✓ Saved! Going back…"
              : "Save Changes"
          }
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-sm mb-2">{label}</p>
      {children}
    </div>
  );
}