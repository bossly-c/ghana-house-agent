"use client";

import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import type { PropertySearchParams } from "./SearchOverlay";
import { PROPERTY_TYPES } from "@/lib/constants";

interface Props {
  onBack:   () => void;
  onSearch: (params: PropertySearchParams) => void;
}

export default function ParameterSearchPage({ onBack, onSearch }: Props) {
  const [area,     setArea]     = useState("");
  const [type,     setType]     = useState("");
  const [listing,  setListing]  = useState<"" | "rent" | "sale">("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleSearch() {
    onSearch({ area, type, listing, minPrice, maxPrice });
  }

  const inputStyle: React.CSSProperties = {
    display:          "block",
    width:            "100%",
    padding:          "11px 14px",
    borderRadius:     "0.875rem",
    border:           "1.5px solid var(--border-col, #e4e4e7)",
    background:       "var(--surface, #ffffff)",
    color:            "var(--text-main, #18181b)",
    fontSize:         "0.95rem",
    outline:          "none",
    WebkitAppearance: "none",
    appearance:       "none" as any,
    boxSizing:        "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display:       "block",
    fontSize:      "0.7rem",
    fontWeight:    800,
    color:         "#71717a",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom:  "8px",
  };

  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        700,
        background:    "var(--bg, #f4f4f5)",
        display:       "flex",
        flexDirection: "column",
        paddingTop:    "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "12px",
          padding:        "12px 16px",
          background:     "var(--surface, #ffffff)",
          borderBottom:   "1px solid var(--border-col, #e4e4e7)",
          flexShrink:     0,
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width:          "40px",
            height:         "40px",
            borderRadius:   "50%",
            background:     "var(--surface-2, #f4f4f5)",
            border:         "none",
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
          }}
        >
          <ArrowLeft size={20} style={{ color: "var(--text-main, #18181b)" }} />
        </button>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              margin:     0,
              fontSize:   "1.05rem",
              fontWeight: 700,
              color:      "var(--text-main, #18181b)",
              fontFamily: "var(--font-fraunces, Georgia, serif)",
            }}
          >
            Search by Parameters
          </h2>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#71717a" }}>
            Fill in what you&apos;re looking for
          </p>
        </div>
      </div>

      {/* Scrollable form */}
      <div
        style={{
          flex:          1,
          overflowY:     "auto",
          padding:       "20px 16px",
          display:       "flex",
          flexDirection: "column",
          gap:           "20px",
        }}
      >
        {/* Area */}
        <div>
          <label style={labelStyle}>Area / City / Location</label>
          <input
            type="text"
            placeholder="e.g. East Legon, Kumasi, Tema…"
            value={area}
            onChange={e => setArea(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* House type — sourced from the same list used in the upload form */}
        <div>
          <label style={labelStyle}>Type of House</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={inputStyle}
          >
            <option value="">Any type</option>
            {PROPERTY_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Rent or Sale */}
        <div>
          <label style={labelStyle}>Rent or Sale</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["", "rent", "sale"] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setListing(l)}
                style={{
                  flex:         1,
                  padding:      "11px 4px",
                  borderRadius: "0.875rem",
                  fontSize:     "0.85rem",
                  fontWeight:   700,
                  border:       `1.5px solid ${listing === l ? "#059669" : "var(--border-col, #e4e4e7)"}`,
                  background:   listing === l ? "#059669" : "var(--surface, #ffffff)",
                  color:        listing === l ? "#ffffff"  : "#71717a",
                  cursor:       "pointer",
                  transition:   "all 0.15s",
                }}
              >
                {l === ""      ? "Both"
                 : l === "rent" ? "🔴 Rent"
                                : "🟢 Sale"}
              </button>
            ))}
          </div>
        </div>

        {/* Price range */}
        <div>
          <label style={labelStyle}>Price Range (GH₵)</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              min={0}
              style={{ ...inputStyle, flex: 1 }}
            />
            <span style={{ color: "#71717a", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 }}>–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              min={0}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#71717a" }}>
            Enter only a Max to search up to that price.
            Enter only a Min to search from that price upward.
            Enter both for a range.
          </p>
        </div>

        {/* Spacer so sticky button never covers last field */}
        <div style={{ height: "80px" }} />
      </div>

      {/* Sticky search button */}
      <div
        style={{
          flexShrink:   0,
          padding:      "12px 16px",
          background:   "var(--surface, #ffffff)",
          borderTop:    "1px solid var(--border-col, #e4e4e7)",
          boxShadow:    "0 -4px 24px rgba(0,0,0,0.07)",
        }}
      >
        <button
          onClick={handleSearch}
          type="button"
          style={{
            width:          "100%",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "8px",
            padding:        "15px",
            borderRadius:   "0.875rem",
            background:     "#059669",
            color:          "#ffffff",
            fontWeight:     700,
            fontSize:       "1rem",
            border:         "none",
            cursor:         "pointer",
            boxShadow:      "0 2px 16px rgba(5,150,105,0.4)",
          }}
        >
          <Search size={18} />
          Search Houses
        </button>
      </div>
    </div>
  );
}