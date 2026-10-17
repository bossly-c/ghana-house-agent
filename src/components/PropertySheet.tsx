"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  X, Heart, ExternalLink, MapPin, BedDouble,
  Bath, Maximize2, Eye, Calendar, ChevronRight,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useFavourites } from "./FavouritesTab";
import { formatGHS } from "@/lib/format";
import type { PropertyDetail, PropertyUnit } from "@/lib/types";

interface Props {
  propertyId: string;
  onClose:    () => void;
}

export default function PropertySheet({ propertyId, onClose }: Props) {
  const { isFav, toggle }               = useFavourites();
  const [property, setProperty]         = useState<PropertyDetail | null>(null);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/properties/${propertyId}`);
      const data = await res.json();
      setProperty(data.property ?? null);
      setSelectedUnit(null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.velocity.y > 300 || info.offset.y > 120) {
      if (expanded) setExpanded(false);
      else onClose();
    } else if (info.velocity.y < -300 || info.offset.y < -80) {
      setExpanded(true);
    }
  };

  const isRent   = property?.listingType === "rent";
  const img      = property?.images?.find((u: string) => u.startsWith("http")) ?? null;
  const peekY    = "55%";
  const expandedY = "5%";

  return (
    <AnimatePresence>
      <motion.div
        ref={sheetRef}
        key="sheet"
        className="fixed left-0 right-0 bottom-0 z-40 rounded-t-3xl overflow-hidden"
        style={{
          background:    "var(--surface)",
          boxShadow:     "0 -18px 60px rgba(4,32,26,0.30)",
          paddingBottom: "calc(var(--sab) + 4px)",
        }}
        initial={{ y: "100%" }}
        animate={{ y: expanded ? expandedY : peekY }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onClick={() => setExpanded((e) => !e)}
        >
          <div
            className="w-10 h-1.5 rounded-full"
            style={{ background: "var(--border-col)" }}
          />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pb-2">
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <X size={18} style={{ color: "var(--text-muted)" }} />
          </button>

          <div className="flex items-center gap-2">
            {property && (
              <button
                onClick={() => toggle(property.id)}
                type="button"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-90"
                style={{
                  background: isFav(property.id) ? "#fee2e2" : "var(--surface-2)",
                  color:      isFav(property.id) ? "#ef4444" : "var(--text-muted)",
                  border:     "1px solid var(--border-col)",
                }}
              >
                <Heart
                  size={16}
                  className={isFav(property.id) ? "fill-red-500" : ""}
                />
                {isFav(property.id) ? "Saved" : "Save"}
              </button>
            )}
            {property && (
              <Link
                href={`/property/${property.id}`}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{ background: "#0c3b2e", color: "#f2b70a" }}
              >
                View <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto no-scrollbar px-5 pb-4"
          style={{ maxHeight: "88vh" }}
        >
          {/* Loading */}
          {loading && (
            <div className="py-10 flex justify-center">
              <span
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "#0c3b2e" }}
              />
            </div>
          )}

          {!loading && !property && (
            <p className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
              Could not load this property.
            </p>
          )}

          {!loading && property && (
            <>
              {/* ── Photo ─────────────────────────────────── */}
              {img && (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 mt-1">
                  <img
                    src={img}
                    className="w-full h-full object-cover"
                    alt={property.title}
                  />
                  <span
                    className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase"
                    style={{
                      background: isRent ? "#dc2626" : "#16a34a",
                      color:      "#fff",
                    }}
                  >
                    {isRent ? "For Rent" : "For Sale"}
                  </span>
                  {property.isCompound && (
                    <span
                      className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                      style={{ background: "#f2b70a", color: "#0c3b2e" }}
                    >
                      <Building2 size={11} /> Compound
                    </span>
                  )}
                </div>
              )}

              {/* ── Title + location ──────────────────────── */}
              <h2
                className="font-display text-xl font-bold leading-snug"
                style={{ color: "var(--text-main)" }}
              >
                {property.title}
              </h2>
              <p
                className="mt-1 flex items-center gap-1 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <MapPin size={13} />
                {property.area}, {property.city} · {property.region}
              </p>

              {/* ══════════════════════════════════════════
                  COMPOUND — unit selector
              ══════════════════════════════════════════ */}
              {property.isCompound && property.units.length > 0 && (
                <div className="mt-4">
                  <p
                    className="text-xs font-extrabold uppercase tracking-wider mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {selectedUnit ? "Selected unit" : "Choose a unit type"}
                  </p>

                  {/* All unit cards */}
                  {!selectedUnit && (
                    <div className="space-y-2.5">
                      {property.units.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            setSelectedUnit(unit);
                            setExpanded(true);
                          }}
                          className="w-full text-left rounded-2xl p-4 flex items-center justify-between transition active:scale-[0.98]"
                          style={{
                            background: "var(--surface-2)",
                            border:     "1.5px solid var(--border-col)",
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase mb-1.5"
                              style={{
                                background: isRent ? "#fee2e2" : "#dcfce7",
                                color:      isRent ? "#dc2626" : "#16a34a",
                              }}
                            >
                              {unit.unitType}
                            </span>
                            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                              {unit.bedrooms > 0 && (
                                <span className="flex items-center gap-1">
                                  <BedDouble size={11} /> {unit.bedrooms} bed{unit.bedrooms > 1 ? "s" : ""}
                                </span>
                              )}
                              {unit.bathrooms > 0 && (
                                <span className="flex items-center gap-1">
                                  <Bath size={11} /> {unit.bathrooms} bath{unit.bathrooms > 1 ? "s" : ""}
                                </span>
                              )}
                              {unit.halls > 0 && (
                                <span className="flex items-center gap-1">
                                  🚪 {unit.halls} hall{unit.halls > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {!unit.available && (
                              <p className="text-[10px] font-bold text-red-500 mt-1">
                                Currently taken
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p
                              className="font-display text-lg font-bold"
                              style={{ color: "#0c3b2e" }}
                            >
                              {formatGHS(unit.price)}
                            </p>
                            {isRent && (
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                /{unit.pricePeriod}
                              </p>
                            )}
                            <ChevronRight
                              size={16}
                              className="ml-auto mt-1"
                              style={{ color: "var(--text-muted)" }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected unit detail */}
                  {selectedUnit && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedUnit(null)}
                        className="flex items-center gap-1.5 text-xs font-bold mb-3 px-3 py-1.5 rounded-full"
                        style={{
                          background: "var(--surface-2)",
                          color:      "var(--text-muted)",
                          border:     "1px solid var(--border-col)",
                        }}
                      >
                        ← All units
                      </button>

                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: "var(--surface-2)",
                          border:     "1.5px solid #f2b70a",
                        }}
                      >
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase mb-2"
                          style={{
                            background: isRent ? "#fee2e2" : "#dcfce7",
                            color:      isRent ? "#dc2626" : "#16a34a",
                          }}
                        >
                          {selectedUnit.unitType}
                        </span>

                        {/* Big price */}
                        <p
                          className="font-display font-bold leading-none"
                          style={{ fontSize: "2.6rem", color: "#0c3b2e" }}
                        >
                          {formatGHS(selectedUnit.price)}
                          {isRent && (
                            <span
                              className="text-lg font-semibold ml-1"
                              style={{ color: "var(--text-muted)" }}
                            >
                              /{selectedUnit.pricePeriod}
                            </span>
                          )}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { label: "Beds",  val: selectedUnit.bedrooms,  show: selectedUnit.bedrooms > 0  },
                            { label: "Baths", val: selectedUnit.bathrooms, show: selectedUnit.bathrooms > 0 },
                            { label: "Halls", val: selectedUnit.halls,     show: selectedUnit.halls > 0     },
                          ]
                            .filter((s) => s.show)
                            .map(({ label, val }) => (
                              <span
                                key={label}
                                className="rounded-xl px-3 py-1.5 text-xs font-bold"
                                style={{ background: "#0c3b2e12", color: "#0c3b2e" }}
                              >
                                {val} {label}
                              </span>
                            ))}
                          {!selectedUnit.available && (
                            <span
                              className="rounded-xl px-3 py-1.5 text-xs font-bold"
                              style={{ background: "#fee2e2", color: "#dc2626" }}
                            >
                              Currently taken
                            </span>
                          )}
                        </div>

                        {selectedUnit.description && (
                          <p
                            className="mt-3 text-sm leading-relaxed"
                            style={{ color: "var(--text-main)" }}
                          >
                            {selectedUnit.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════
                  SINGLE PROPERTY — normal price + key stats
              ══════════════════════════════════════════ */}
              {!property.isCompound && (
                <>
                  <p
                    className="font-display font-bold leading-none mt-3"
                    style={{ fontSize: "2.6rem", color: "#0c3b2e" }}
                  >
                    {formatGHS(property.price)}
                    {isRent && (
                      <span
                        className="text-lg font-semibold ml-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        /{property.pricePeriod}
                      </span>
                    )}
                  </p>

                  {/* Key stats — uses beds/baths/halls from PropertyDetail */}
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { icon: BedDouble, val: property.beds,           label: "Beds"  },
                      { icon: Bath,      val: property.baths,          label: "Baths" },
                      { icon: Maximize2, val: property.halls > 0 ? `${property.halls}` : "—", label: "Halls" },
                      { icon: Eye,       val: property.views ?? 0,     label: "Views" },
                    ].map(({ icon: Icon, val, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center justify-center rounded-xl py-2.5 gap-1"
                        style={{
                          background: "var(--surface-2)",
                          border:     "1px solid var(--border-col)",
                        }}
                      >
                        <Icon size={16} style={{ color: "#0c3b2e" }} />
                        <span
                          className="text-sm font-extrabold"
                          style={{ color: "var(--text-main)" }}
                        >
                          {val}
                        </span>
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wide"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Compound starting price (when no unit selected) ── */}
              {property.isCompound && !selectedUnit && (
                <p
                  className="mt-3 text-sm font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  Starting from{" "}
                  <span
                    className="font-display text-xl font-bold"
                    style={{ color: "#0c3b2e" }}
                  >
                    {formatGHS(property.price)}
                  </span>
                  {isRent && `/${property.pricePeriod}`}
                </p>
              )}

              {/* ── Viewing days ──────────────────────────── */}
              {property.viewingDays && property.viewingDays.length > 0 && (
                <div className="mt-4">
                  <p
                    className="text-xs font-extrabold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Viewing days
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {property.viewingDays.map((d: string) => (
                      <span
                        key={d}
                        className="rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1"
                        style={{ background: "#0c3b2e12", color: "#0c3b2e" }}
                      >
                        <Calendar size={11} /> {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Description ───────────────────────────── */}
              {property.description && (
                <div className="mt-4">
                  <p
                    className="text-xs font-extrabold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    About
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
                    {property.description}
                  </p>
                </div>
              )}

              {/* ── Full page CTA ─────────────────────────── */}
              <Link
                href={`/property/${property.id}`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold text-sm"
                style={{ background: "#0c3b2e", color: "#f2b70a" }}
              >
                View full listing &amp; book a tour
                <ExternalLink size={15} />
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}