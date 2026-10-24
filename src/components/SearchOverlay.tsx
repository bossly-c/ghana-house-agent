"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

interface NominatimResult {
  place_id:     number;
  display_name: string;
  lat:          string;
  lon:          string;
}

export interface PropertySearchParams {
  area?:     string;
  type?:     string;
  listing?:  "rent" | "sale" | "";
  minPrice?: string;
  maxPrice?: string;
}

interface Props {
  onClose:           () => void;
  onFlyTo:           (lat: number, lng: number, zoom?: number) => void;
  onOpenParamSearch: () => void;
}

export default function SearchOverlay({ onClose, onFlyTo, onOpenParamSearch }: Props) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [busy,    setBusy]    = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?format=json` +
          `&q=${encodeURIComponent(query + " Ghana")}` +
          `&limit=6&countrycodes=gh`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        setResults(await res.json());
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  function pick(r: NominatimResult) {
    onFlyTo(parseFloat(r.lat), parseFloat(r.lon), 14);
    onClose();
  }

  return (
    <div
      style={{
        position:     "absolute",
        top:          "8px",
        left:         "8px",
        right:        "8px",
        zIndex:       600,
        borderRadius: "1.25rem",
        background:   "var(--surface, #ffffff)",
        border:       "1.5px solid var(--border-col, #e4e4e7)",
        boxShadow:    "0 8px 40px rgba(0,0,0,0.18)",
        overflow:     "hidden",
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Location search row */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "8px",
        padding:      "12px 14px",
        borderBottom: results.length > 0 ? "1px solid var(--border-col, #e4e4e7)" : "none",
      }}>
        <Search size={16} style={{ color: "#71717a", flexShrink: 0 }} />
        <input
          autoFocus
          type="text"
          placeholder="Search any place in Ghana…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex:       1,
            background: "transparent",
            border:     "none",
            outline:    "none",
            fontSize:   "0.9rem",
            color:      "var(--text-main, #18181b)",
            minWidth:   0,
          }}
        />
        {busy && <span style={{ fontSize: "0.7rem", color: "#71717a", flexShrink: 0 }}>…</span>}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
        >
          <X size={18} style={{ color: "#71717a" }} />
        </button>
      </div>

      {/* Nominatim results */}
      {results.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {results.map((r, i) => (
            <li key={r.place_id}>
              <button
                onClick={() => pick(r)}
                style={{
                  width:        "100%",
                  textAlign:    "left",
                  padding:      "11px 16px",
                  background:   "transparent",
                  border:       "none",
                  borderBottom: i < results.length - 1
                    ? "1px solid var(--border-col, #f4f4f5)"
                    : "none",
                  cursor:       "pointer",
                  display:      "block",
                }}
              >
                <span style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", color: "var(--text-main, #18181b)" }}>
                  {r.display_name.split(",")[0]}
                </span>
                <span style={{ display: "block", fontSize: "0.73rem", color: "#71717a", marginTop: "2px" }}>
                  {r.display_name.split(",").slice(1, 3).join(",")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() && !busy && results.length === 0 && (
        <p style={{ padding: "11px 16px", fontSize: "0.875rem", color: "#71717a", margin: 0 }}>
          No places found in Ghana
        </p>
      )}

      {/* Parameter search button */}
      <div style={{ padding: "10px 12px" }}>
        <button
          onClick={onOpenParamSearch}
          type="button"
          style={{
            width:        "100%",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            gap:          "8px",
            padding:      "12px",
            borderRadius: "0.875rem",
            background:   "#f0fdf4",
            border:       "1.5px solid #059669",
            color:        "#059669",
            fontWeight:   700,
            fontSize:     "0.9rem",
            cursor:       "pointer",
          }}
        >
          <SlidersHorizontal size={16} />
          Search by Parameters
        </button>
      </div>
    </div>
  );
}