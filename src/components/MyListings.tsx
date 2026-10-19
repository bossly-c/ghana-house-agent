"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Eye, EyeOff, Pencil, MapPin, Loader2,
  Home, ChevronRight, AlertCircle, Trash2,
} from "lucide-react";
import Link from "next/link";
import { formatGHS } from "@/lib/format";

interface MyProperty {
  id:           string;
  title:        string;
  listingType:  string;
  price:        number;
  pricePeriod:  string;
  city:         string;
  area:         string;
  propertyType: string;
  lat:          number | null;
  lng:          number | null;
  isVisible:    boolean;
  photos:       string[];
  createdAt:    string;
}

interface Props {
  token:      string;
  onRefresh?: () => void;   // ← NEW
}

export default function MyListings({ token, onRefresh }: Props) {
  const [listings, setListings] = useState<MyProperty[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error,    setError]    = useState("");

  const fetchMine = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/properties/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setListings(data.properties ?? []);
      else setError(data.error ?? "Failed to load");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const toggleVisibility = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      const res = await fetch(`/api/properties/${id}/visibility`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ isVisible: !current }),
      });
      if (res.ok) {
  setListings((prev) =>
    prev.map((p) => p.id === id ? { ...p, isVisible: !current } : p)
  );
  onRefresh?.();   // ← ADD
}
    } catch { /* silent */ }
    finally { setToggling(null); }
  };

  const deleteListing = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
  setListings((prev) => prev.filter((p) => p.id !== id));
  onRefresh?.();   // ← ADD
} else {
        const data = await res.json();
        alert(data.error ?? "Delete failed");
      }
    } catch {
      alert("Network error — delete failed");
    } finally {
      setDeleting(null);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin" style={{ color: "#0c3b2e" }} />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
        style={{ background: "#fee2e2", color: "#dc2626" }}>
        <AlertCircle size={16} /> {error}
        <button onClick={fetchMine} className="ml-auto underline text-xs">Retry</button>
      </div>
    );
  }

  /* ── Empty ── */
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Home size={40} style={{ color: "var(--border-col)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          You haven&apos;t listed any properties yet.
        </p>
        <Link
          href="/list"
          className="px-6 py-2.5 rounded-2xl text-sm font-extrabold"
          style={{ background: "#0c3b2e", color: "#f2b70a" }}
        >
          + List a Property
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((p) => {
        const isRent      = p.listingType === "rent";
        const img         = p.photos?.find((u) => u.startsWith("http")) ?? null;
        const hasLocation = p.lat !== null && p.lng !== null;
        const isDeleting  = deleting === p.id;

        return (
          <div
            key={p.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border:     `1.5px solid ${p.isVisible ? "var(--border-col)" : "#fca5a5"}`,
              opacity:    isDeleting ? 0.5 : p.isVisible ? 1 : 0.75,
              transition: "opacity .2s",
            }}
          >
            <div className="flex">
              {/* Thumbnail */}
              <div
                className="w-24 h-24 shrink-0 flex items-center justify-center"
                style={{ background: "var(--surface-2)" }}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} className="w-full h-full object-cover" alt={p.title} />
                ) : (
                  <Home size={24} style={{ color: "var(--border-col)" }} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-3 min-w-0">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase mb-1"
                  style={{
                    background: isRent ? "#fee2e2" : "#dcfce7",
                    color:      isRent ? "#dc2626" : "#16a34a",
                  }}
                >
                  {isRent ? "Rent" : "Sale"}
                </span>
                <p
                  className="text-sm font-bold leading-tight truncate"
                  style={{ color: "var(--text-main)" }}
                >
                  {p.title}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {[p.area, p.city].filter(Boolean).join(", ")}
                </p>
                <p className="font-bold text-base mt-1" style={{ color: "#0c3b2e" }}>
                  {formatGHS(p.price)}
                  {isRent && (
                    <span className="text-xs font-normal ml-0.5" style={{ color: "var(--text-muted)" }}>
                      /{p.pricePeriod}
                    </span>
                  )}
                </p>

                {!hasLocation && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                    <MapPin size={10} /> No map location — edit to add
                  </p>
                )}
                {!p.isVisible && (
                  <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wide">
                    Hidden from map
                  </p>
                )}
              </div>
            </div>

            {/* ── Action bar: Visibility · Edit · Delete ── */}
            <div className="flex border-t" style={{ borderColor: "var(--border-col)" }}>

              {/* Visibility toggle */}
              <button
                type="button"
                onClick={() => toggleVisibility(p.id, p.isVisible)}
                disabled={toggling === p.id || isDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition"
                style={{ color: p.isVisible ? "#16a34a" : "#dc2626" }}
              >
                {toggling === p.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : p.isVisible
                    ? <><Eye size={13} /> Visible</>
                    : <><EyeOff size={13} /> Hidden</>
                }
              </button>

              <div style={{ width: 1, background: "var(--border-col)" }} />

              {/* Edit */}
              <Link
                href={`/list/edit/${p.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
                style={{ color: "#0c3b2e" }}
              >
                <Pencil size={13} /> Edit
                <ChevronRight size={11} />
              </Link>

              <div style={{ width: 1, background: "var(--border-col)" }} />

              {/* Delete */}
              <button
                type="button"
                onClick={() => deleteListing(p.id, p.title)}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition"
                style={{ color: "#dc2626" }}
              >
                {isDeleting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <><Trash2 size={13} /> Delete</>
                }
              </button>
            </div>
          </div>
        );
      })}

      <Link
        href="/list"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold border-2 border-dashed"
        style={{ borderColor: "#0c3b2e", color: "#0c3b2e" }}
      >
        + List another property
      </Link>
    </div>
  );
}