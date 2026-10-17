"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  MapPin,
  Phone,
  MessageCircle,
  User,
  Camera,
  Clock,
  Home,
  Check,
  Building2,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  GHANA_REGIONS,
  PROPERTY_TYPES,
  AMENITY_OPTIONS,
  WEEK_DAYS,
} from "@/lib/constants";
import { formatGHS } from "@/lib/format";

type ListingType = "rent" | "sale";
type PricePeriod = "month" | "year" | "week" | "day" | "total";

type CompoundUnit = {
  unitType: string;
  beds: number;
  baths: number;
  halls: number;
  price: number;
  pricePeriod: PricePeriod;
  description: string;
};

const BLANK_UNIT: CompoundUnit = {
  unitType: "",
  beds: 1,
  baths: 1,
  halls: 1,
  price: 0,
  pricePeriod: "month",
  description: "",
};

type FormState = {
  listingType: ListingType;
  propertyType: string;
  region: string;
  address: string;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  isCompound: boolean;
  units: CompoundUnit[];
  beds: number;
  baths: number;
  halls: number;
  price: number;
  pricePeriod: PricePeriod;
  amenities: string[];
  photos: File[];
  panoFiles: File[];
  availableDays: string[];
  availableFrom: string;
  availableTo: string;
  agentName: string;
  agentPhone: string;
  agentWhatsApp: string;
};

const INITIAL: FormState = {
  listingType: "rent",
  propertyType: "",
  region: "",
  address: "",
  title: "",
  description: "",
  lat: null,
  lng: null,
  isCompound: false,
  units: [{ ...BLANK_UNIT }, { ...BLANK_UNIT }],
  beds: 1,
  baths: 1,
  halls: 1,
  price: 0,
  pricePeriod: "month",
  amenities: [],
  photos: [],
  panoFiles: [],
  availableDays: [],
  availableFrom: "08:00",
  availableTo: "18:00",
  agentName: "",
  agentPhone: "",
  agentWhatsApp: "",
};

const STEPS = [
  "Listing Basics",
  "Property Details",
  "Photos",
  "360° Tour",
  "Viewing Schedule",
  "Contact Info",
];

export default function ListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [locating, setLocating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const panoInputRef = useRef<HTMLInputElement>(null);

  /* ── Autofill contact from logged-in user ── */
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        agentName: user.name ?? f.agentName,
        agentPhone: user.phone ?? f.agentPhone,
        agentWhatsApp: user.whatsapp ?? f.agentWhatsApp,
      }));
    }
  }, [user]);

  /* ── Helpers ── */
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setUnit(i: number, patch: Partial<CompoundUnit>) {
    setForm((f) => {
      const units = f.units.map((u, idx) => (idx === i ? { ...u, ...patch } : u));
      return { ...f, units };
    });
  }

  function addUnit() {
    setForm((f) => ({ ...f, units: [...f.units, { ...BLANK_UNIT }] }));
  }

  function removeUnit(i: number) {
    setForm((f) => ({ ...f, units: f.units.filter((_, idx) => idx !== i) }));
  }

  function toggleAmenity(a: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter((x) => x !== a)
        : [...f.amenities, a],
    }));
  }

  function toggleDay(d: string) {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(d)
        ? f.availableDays.filter((x) => x !== d)
        : [...f.availableDays, d],
    }));
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", pos.coords.latitude);
        set("lng", pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  }

  /* ── Validation ── */
  function canSubmit(): boolean {
    if (!form.propertyType || !form.region || !form.address || !form.title) return false;
    if (form.isCompound) {
      if (form.units.length < 2) return false;
      for (const u of form.units) {
        if (!u.unitType || u.price <= 0) return false;
      }
    } else {
      if (form.price <= 0) return false;
    }
    if (!form.agentName || !form.agentPhone) return false;
    return true;
  }

  /* ── Submit ── */
  async function submit() {
    if (!canSubmit()) return;
    setSubmitting(true);
    try {
      /* Upload photos */
      const photoUrls: string[] = [];
      for (const file of form.photos) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const j = await res.json();
          photoUrls.push(j.url as string);
        }
      }

      /* Compute price for compound (lowest unit price) */
      const priceToSend = form.isCompound
        ? Math.min(...form.units.map((u) => u.price))
        : form.price;

      /* Build payload */
      const token =
        typeof window !== "undefined" ? localStorage.getItem("gha_token") : null;

      const payload = {
        listingType: form.listingType,
        propertyType: form.propertyType,
        region: form.region,
        address: form.address,
        title: form.title,
        description: form.description,
        lat: form.lat,
        lng: form.lng,
        beds: form.isCompound ? 0 : form.beds,
        baths: form.isCompound ? 0 : form.baths,
        halls: form.isCompound ? 0 : form.halls,
        price: priceToSend,
        pricePeriod: form.isCompound ? "month" : form.pricePeriod,
        amenities: form.amenities,
        photos: photoUrls,
        availableDays: form.availableDays,
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
        agentName: form.agentName,
        agentPhone: form.agentPhone,
        agentWhatsApp: form.agentWhatsApp,
        isCompound: form.isCompound,
        units: form.isCompound ? form.units : [],
      };

      await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Done screen ── */
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-[var(--bg-app)] text-[var(--text-main)]">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-center">Listing Submitted!</h1>
        <p className="text-[var(--text-muted)] text-center max-w-xs">
          Your property has been listed. It will appear on the map shortly.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-2xl bg-[var(--brand)] text-white font-semibold"
        >
          Back to Map
        </button>
      </div>
    );
  }

  /* ── Progress bar ── */
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border-col)] px-4 py-3"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => (step === 0 ? router.push("/") : setStep((s) => s - 1))}
            className="p-2 rounded-full hover:bg-[var(--surface-2)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-[var(--text-muted)]">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="font-semibold text-sm">{STEPS[step]}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="max-w-lg mx-auto mt-2 h-1.5 rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full pb-32">

        {/* ═══════════════════════════════════════════
            STEP 0 — Listing Basics
        ═══════════════════════════════════════════ */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            {/* Listing type */}
            <div>
              <label className="label-sm">Listing Type</label>
              <div className="flex gap-3 mt-2">
                {(["rent", "sale"] as ListingType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => set("listingType", t)}
                    className={`flex-1 py-3 rounded-2xl font-semibold capitalize border-2 transition-all ${
                      form.listingType === t
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--border-col)] text-[var(--text-muted)]"
                    }`}
                  >
                    {t === "rent" ? "For Rent" : "For Sale"}
                  </button>
                ))}
              </div>
            </div>

            {/* Property type */}
            <div>
              <label className="label-sm">Property Type</label>
              <select
                className="input mt-2"
                value={form.propertyType}
                onChange={(e) => set("propertyType", e.target.value)}
              >
                <option value="">Select type…</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="label-sm">Region</label>
              <select
                className="input mt-2"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
              >
                <option value="">Select region…</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="label-sm">Address / Area</label>
              <input
                className="input mt-2"
                placeholder="e.g. Spintex Road, East Legon, Accra"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>

            {/* Title */}
            <div>
              <label className="label-sm">Listing Title</label>
              <input
                className="input mt-2"
                placeholder="e.g. Spacious 3-Bedroom House with Pool"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label-sm">Description</label>
              <textarea
                className="input mt-2 min-h-[100px] resize-none"
                placeholder="Describe the property…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* GPS */}
            <div>
              <label className="label-sm">GPS Coordinates (optional)</label>
              <div className="flex gap-2 mt-2">
                <input
                  className="input flex-1"
                  placeholder="Latitude"
                  type="number"
                  value={form.lat ?? ""}
                  onChange={(e) =>
                    set("lat", e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
                <input
                  className="input flex-1"
                  placeholder="Longitude"
                  type="number"
                  value={form.lng ?? ""}
                  onChange={(e) =>
                    set("lng", e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
              </div>
              <button
                onClick={locateMe}
                disabled={locating}
                className="mt-2 flex items-center gap-2 text-sm text-[var(--brand)] font-medium"
              >
                <MapPin className="w-4 h-4" />
                {locating ? "Locating…" : "Use my current location"}
              </button>
            </div>

            {/* ─────────────────────────────────────────
                COMPOUND / MULTI-UNIT SECTION
                Sits between Step 1 and Step 2
            ───────────────────────────────────────── */}
            <div className="rounded-2xl border-2 border-dashed border-[var(--border-col)] p-4 flex flex-col gap-4">
              {/* Toggle */}
              <button
                onClick={() => set("isCompound", !form.isCompound)}
                className="flex items-center gap-3 w-full"
              >
                <div
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    form.isCompound ? "bg-[var(--brand)]" : "bg-[var(--surface-2)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${
                      form.isCompound ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <p className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--brand)]" />
                    This is a compound / multi-unit property
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Add multiple unit types, each with their own price
                  </p>
                </div>
              </button>

              {/* Unit builder — visible when compound is ON */}
              {form.isCompound && (
                <div className="flex flex-col gap-4">
                  {form.units.map((unit, i) => (
                    <div
                      key={i}
                      className="bg-[var(--surface-2)] rounded-2xl p-4 flex flex-col gap-3 relative"
                    >
                      {/* Remove button (only if 3+ units) */}
                      {form.units.length > 2 && (
                        <button
                          onClick={() => removeUnit(i)}
                          className="absolute top-3 right-3 p-1 rounded-full bg-red-100 dark:bg-red-900"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}

                      <p className="font-semibold text-sm text-[var(--text-muted)]">
                        Unit {i + 1}
                      </p>

                      {/* Unit type */}
                      <div>
                        <label className="label-sm">Unit Type</label>
                        <input
                          className="input mt-1"
                          placeholder="e.g. 1-Bedroom Self-Contain, Chamber & Hall…"
                          value={unit.unitType}
                          onChange={(e) => setUnit(i, { unitType: e.target.value })}
                        />
                      </div>

                      {/* Beds / Baths / Halls */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="label-sm">Beds</label>
                          <input
                            type="number"
                            min={0}
                            className="input mt-1"
                            value={unit.beds}
                            onChange={(e) =>
                              setUnit(i, { beds: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <label className="label-sm">Baths</label>
                          <input
                            type="number"
                            min={0}
                            className="input mt-1"
                            value={unit.baths}
                            onChange={(e) =>
                              setUnit(i, { baths: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <label className="label-sm">Halls</label>
                          <input
                            type="number"
                            min={0}
                            className="input mt-1"
                            value={unit.halls}
                            onChange={(e) =>
                              setUnit(i, { halls: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>

                      {/* Price + Period */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="label-sm">Price (GH₵)</label>
                          <input
                            type="number"
                            min={0}
                            className="input mt-1"
                            placeholder="0"
                            value={unit.price || ""}
                            onChange={(e) =>
                              setUnit(i, { price: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="w-28">
                          <label className="label-sm">Per</label>
                          <select
                            className="input mt-1"
                            value={unit.pricePeriod}
                            onChange={(e) =>
                              setUnit(i, { pricePeriod: e.target.value as PricePeriod })
                            }
                          >
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                            <option value="week">Week</option>
                            <option value="day">Day</option>
                            <option value="total">Total</option>
                          </select>
                        </div>
                      </div>

                      {/* Optional description */}
                      <div>
                        <label className="label-sm">Description (optional)</label>
                        <input
                          className="input mt-1"
                          placeholder="Any extra details about this unit…"
                          value={unit.description}
                          onChange={(e) => setUnit(i, { description: e.target.value })}
                        />
                      </div>

                      {/* Preview price */}
                      {unit.price > 0 && (
                        <p className="text-xs text-[var(--brand)] font-semibold">
                          {formatGHS(unit.price)} / {unit.pricePeriod}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Add unit button */}
                  <button
                    onClick={addUnit}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[var(--brand)] text-[var(--brand)] font-semibold text-sm"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Add Another Unit Type
                  </button>

                  {/* Summary */}
                  {form.units.some((u) => u.price > 0) && (
                    <div className="bg-[var(--brand)]/10 rounded-xl p-3 text-sm text-[var(--brand)] font-medium">
                      Map will show:{" "}
                      <span className="font-bold">
                        from {formatGHS(Math.min(...form.units.filter((u) => u.price > 0).map((u) => u.price)))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* END COMPOUND SECTION */}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 1 — Property Details
        ═══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {form.isCompound ? (
              /* Compound: show read-only unit summary */
              <div className="flex flex-col gap-3">
                <div className="bg-[var(--surface-2)] rounded-2xl p-4">
                  <p className="font-semibold flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-[var(--brand)]" />
                    Compound Property
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {form.units.length} unit type{form.units.length !== 1 ? "s" : ""} defined.
                    Prices and details are set per unit.
                  </p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  To edit units, go back to Step 1.
                </p>

                {/* Amenities still apply to the whole compound */}
                <div>
                  <label className="label-sm">Compound Amenities</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AMENITY_OPTIONS.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          form.amenities.includes(a)
                            ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                            : "border-[var(--border-col)] text-[var(--text-muted)]"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Single listing details */
              <div className="flex flex-col gap-5">
                {/* Beds / Baths / Halls */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label-sm">Bedrooms</label>
                    <input
                      type="number"
                      min={0}
                      className="input mt-2"
                      value={form.beds}
                      onChange={(e) => set("beds", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="label-sm">Bathrooms</label>
                    <input
                      type="number"
                      min={0}
                      className="input mt-2"
                      value={form.baths}
                      onChange={(e) => set("baths", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="label-sm">Halls</label>
                    <input
                      type="number"
                      min={0}
                      className="input mt-2"
                      value={form.halls}
                      onChange={(e) => set("halls", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="label-sm">Price (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    className="input mt-2"
                    placeholder="0"
                    value={form.price || ""}
                    onChange={(e) => set("price", parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Price period */}
                <div>
                  <label className="label-sm">Price Period</label>
                  <select
                    className="input mt-2"
                    value={form.pricePeriod}
                    onChange={(e) => set("pricePeriod", e.target.value as PricePeriod)}
                  >
                    <option value="month">Per Month</option>
                    <option value="year">Per Year</option>
                    <option value="week">Per Week</option>
                    <option value="day">Per Day</option>
                    <option value="total">Total Price</option>
                  </select>
                </div>

                {/* Preview */}
                {form.price > 0 && (
                  <div className="bg-[var(--brand)]/10 rounded-xl p-3 text-sm text-[var(--brand)] font-medium">
                    Listing price:{" "}
                    <span className="font-bold">
                      {formatGHS(form.price)} / {form.pricePeriod}
                    </span>
                  </div>
                )}

                {/* Amenities */}
                <div>
                  <label className="label-sm">Amenities</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AMENITY_OPTIONS.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          form.amenities.includes(a)
                            ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                            : "border-[var(--border-col)] text-[var(--text-muted)]"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 2 — Photos
        ═══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="label-sm">Property Photos</label>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Add clear, well-lit photos. First photo is the cover.
              </p>
            </div>

            {/* Upload button */}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-[var(--border-col)] hover:border-[var(--brand)] transition-colors"
            >
              <Upload className="w-8 h-8 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">
                Tap to upload photos
              </span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                set("photos", [...form.photos, ...files]);
              }}
            />

            {/* Photo previews */}
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.photos.map((f, i) => (
                  <div key={i} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(f)}
                      alt={`photo-${i}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                        Cover
                      </span>
                    )}
                    <button
                      onClick={() =>
                        set(
                          "photos",
                          form.photos.filter((_, idx) => idx !== i)
                        )
                      }
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 3 — 360° Tour
        ═══════════════════════════════════════════ */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="label-sm">360° Panorama Photos</label>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Use Google Street View app to capture Photo Sphere images of each
                room. Upload those equirectangular JPGs here.
              </p>
            </div>

            <button
              onClick={() => panoInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-[var(--border-col)] hover:border-[var(--brand)] transition-colors"
            >
              <Camera className="w-8 h-8 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">
                Tap to upload panoramas (optional)
              </span>
            </button>
            <input
              ref={panoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                set("panoFiles", [...form.panoFiles, ...files]);
              }}
            />

            {form.panoFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                {form.panoFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[var(--surface-2)] rounded-xl px-4 py-3"
                  >
                    <span className="text-sm truncate max-w-[220px]">{f.name}</span>
                    <button
                      onClick={() =>
                        set(
                          "panoFiles",
                          form.panoFiles.filter((_, idx) => idx !== i)
                        )
                      }
                    >
                      <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[var(--surface-2)] rounded-2xl p-4 text-sm text-[var(--text-muted)]">
              <p className="font-medium text-[var(--text-main)] mb-1">
                💡 How it works
              </p>
              <ol className="list-decimal list-inside flex flex-col gap-1 text-xs">
                <li>Open Google Street View → Camera → Photo Sphere</li>
                <li>Walk through each room capturing panoramas</li>
                <li>Export & upload the equirectangular JPGs here</li>
                <li>
                  Our team will stitch them into an interactive tour within 24h
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 4 — Viewing Schedule
        ═══════════════════════════════════════════ */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="label-sm">Available Days</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      form.availableDays.includes(d)
                        ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                        : "border-[var(--border-col)] text-[var(--text-muted)]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label-sm">From</label>
                <div className="relative mt-2">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="time"
                    className="input pl-9"
                    value={form.availableFrom}
                    onChange={(e) => set("availableFrom", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="label-sm">To</label>
                <div className="relative mt-2">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="time"
                    className="input pl-9"
                    value={form.availableTo}
                    onChange={(e) => set("availableTo", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 5 — Contact Info
        ═══════════════════════════════════════════ */}
        {step === 5 && (
          <div className="flex flex-col gap-5">
            {user && (
              <div className="bg-[var(--brand)]/10 rounded-xl p-3 text-sm text-[var(--brand)]">
                ✓ Contact info autofilled from your profile
              </div>
            )}

            <div>
              <label className="label-sm">Your Name</label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  className="input pl-9"
                  placeholder="Full name"
                  value={form.agentName}
                  onChange={(e) => set("agentName", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label-sm">Phone Number</label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  className="input pl-9"
                  placeholder="+233 XX XXX XXXX"
                  type="tel"
                  value={form.agentPhone}
                  onChange={(e) => set("agentPhone", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label-sm">WhatsApp Number</label>
              <div className="relative mt-2">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  className="input pl-9"
                  placeholder="+233 XX XXX XXXX"
                  type="tel"
                  value={form.agentWhatsApp}
                  onChange={(e) => set("agentWhatsApp", e.target.value)}
                />
              </div>
            </div>

            {/* Final summary */}
            <div className="bg-[var(--surface-2)] rounded-2xl p-4 flex flex-col gap-2 text-sm">
              <p className="font-semibold text-[var(--text-main)]">
                Listing Summary
              </p>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Type</span>
                <span className="capitalize">{form.listingType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Property</span>
                <span>{form.propertyType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Region</span>
                <span>{form.region}</span>
              </div>
              {form.isCompound ? (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Units</span>
                  <span>
                    {form.units.length} types · from{" "}
                    {formatGHS(
                      Math.min(
                        ...form.units
                          .filter((u) => u.price > 0)
                          .map((u) => u.price)
                      )
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Price</span>
                  <span>
                    {formatGHS(form.price)} / {form.pricePeriod}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Photos</span>
                <span>{form.photos.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border-col)] px-4 py-3"
        style={{ paddingBottom: "calc(var(--sab) + 12px)" }}
      >
        <div className="max-w-lg mx-auto">
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                step === 0 &&
                (!form.propertyType ||
                  !form.region ||
                  !form.address ||
                  !form.title ||
                  (form.isCompound &&
                    (form.units.length < 2 ||
                      form.units.some((u) => !u.unitType || u.price <= 0))))
              }
              className="w-full py-4 rounded-2xl bg-[var(--brand)] text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting || !canSubmit()}
              className="w-full py-4 rounded-2xl bg-[var(--brand)] text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit Listing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}