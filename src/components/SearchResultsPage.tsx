"use client";

import { useCallback } from "react";
import { ArrowLeft, MapPin, Home, MessageCircle } from "lucide-react";
import type { PropertyListItem } from "@/lib/types";
import type { PropertySearchParams } from "./SearchOverlay";

interface Props {
  params:   PropertySearchParams;
  results:  PropertyListItem[];
  onBack:   () => void;
  onSelect: (id: string) => void;
}

function buildWhatsAppMessage(params: PropertySearchParams): string {
  const lines: string[] = [
    "Hello, I'm looking for a property with the following requirements:",
  ];
  if (params.area)    lines.push(`📍 Area/Location: ${params.area}`);
  if (params.type)    lines.push(`🏠 Type: ${params.type}`);
  if (params.listing) lines.push(`📋 Listing: ${params.listing === "rent" ? "For Rent" : "For Sale"}`);

  if (params.minPrice && params.maxPrice)
    lines.push(`💰 Price: GH₵ ${Number(params.minPrice).toLocaleString()} – GH₵ ${Number(params.maxPrice).toLocaleString()}`);
  else if (params.minPrice)
    lines.push(`💰 Price: From GH₵ ${Number(params.minPrice).toLocaleString()}`);
  else if (params.maxPrice)
    lines.push(`💰 Price: Up to GH₵ ${Number(params.maxPrice).toLocaleString()}`);

  lines.push("\nPlease help me find a suitable property. Thank you.");
  return encodeURIComponent(lines.join("\n"));
}

export default function SearchResultsPage({ params, results, onBack, onSelect }: Props) {
  const openWhatsApp = useCallback(() => {
    window.open(`https://wa.me/233247659532?text=${buildWhatsAppMessage(params)}`, "_blank");
  }, [params]);

  /* Summary chips */
  const chips: string[] = [];
  if (params.area)    chips.push(params.area);
  if (params.type)    chips.push(params.type!);
  if (params.listing) chips.push(params.listing === "rent" ? "For Rent" : "For Sale");
  if (params.minPrice && params.maxPrice)
    chips.push(`GH₵ ${Number(params.minPrice).toLocaleString()} – ${Number(params.maxPrice).toLocaleString()}`);
  else if (params.maxPrice)
    chips.push(`Up to GH₵ ${Number(params.maxPrice).toLocaleString()}`);
  else if (params.minPrice)
    chips.push(`From GH₵ ${Number(params.minPrice).toLocaleString()}`);

  return (
    <>
      {/*
        ── Opaque backdrop ─────────────────────────────────────────────
        Sits at z-index 799 — just below the page (800).
        Guarantees nothing from the map (tiles, markers, controls)
        shows through, even if var(--bg) is momentarily unresolved.
      */}
      <div
        aria-hidden
        style={{
          position:   "fixed",
          inset:      0,
          zIndex:     799,
          background: "#f4f4f5",   /* solid opaque fallback */
        }}
      />

      {/* ── Page ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position:      "fixed",
          inset:         0,
          zIndex:        800,
          display:       "flex",
          flexDirection: "column",
          paddingTop:    "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          isolation:     "isolate",
          background:    "var(--bg, #f4f4f5)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "12px",
            padding:      "12px 16px",
            background:   "var(--surface)",
            borderBottom: "1px solid var(--border-col)",
            flexShrink:   0,
          }}
        >
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              width:          "40px",
              height:         "40px",
              borderRadius:   "50%",
              background:     "var(--surface-2)",
              border:         "none",
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}
          >
            <ArrowLeft size={20} style={{ color: "var(--text-main)" }} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin:     0,
                fontSize:   "1.05rem",
                fontWeight: 700,
                color:      "var(--text-main)",
                fontFamily: "var(--font-fraunces, Georgia, serif)",
              }}
            >
              Results
            </h2>
            {chips.length > 0 && (
              <p
                style={{
                  margin:       0,
                  fontSize:     "0.73rem",
                  color:        "var(--text-muted)",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}
              >
                {chips.join(" · ")}
              </p>
            )}
          </div>

          <span
            style={{
              flexShrink:   0,
              padding:      "4px 12px",
              borderRadius: "999px",
              fontSize:     "0.78rem",
              fontWeight:   700,
              background:   results.length > 0 ? "#059669" : "#dc2626",
              color:        "#ffffff",
            }}
          >
            {results.length} found
          </span>
        </div>

        {/* ── Scrollable list ── */}
        <div
          style={{
            flex:          1,
            overflowY:     "auto",
            padding:       "12px 16px",
            display:       "flex",
            flexDirection: "column",
            gap:           "10px",
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                flex:           1,
                gap:            "14px",
                textAlign:      "center",
                paddingTop:     "60px",
              }}
            >
              <span style={{ fontSize: "3.5rem" }}>🔍</span>
              <h3
                style={{
                  margin:     0,
                  fontSize:   "1.1rem",
                  fontWeight: 700,
                  color:      "var(--text-main)",
                }}
              >
                No properties found
              </h3>
              <p
                style={{
                  margin:     0,
                  fontSize:   "0.875rem",
                  color:      "var(--text-muted)",
                  maxWidth:   "280px",
                  lineHeight: 1.6,
                }}
              >
                We couldn&apos;t find listings matching your criteria right now.
                Use the button below to send a request and we&apos;ll find the right property for you.
              </p>
            </div>
          ) : (
            results.map(p => (
              <PropertyCard key={p.id} property={p} onSelect={onSelect} />
            ))
          )}

          {/* Spacer so last card clears the sticky button */}
          <div style={{ height: "16px" }} />
        </div>

        {/* ── Sticky WhatsApp button — always visible ── */}
        <div
          style={{
            flexShrink: 0,
            padding:    "12px 16px",
            background: "var(--surface)",
            borderTop:  "1px solid var(--border-col)",
            boxShadow:  "0 -4px 24px rgba(0,0,0,0.10)",
          }}
        >
          {results.length > 0 && (
            <p
              style={{
                margin:    "0 0 8px",
                fontSize:  "0.75rem",
                textAlign: "center",
                color:     "var(--text-muted)",
              }}
            >
              Can&apos;t find exactly what you need? Send a request!
            </p>
          )}
          <button
            onClick={openWhatsApp}
            type="button"
            style={{
              width:          "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "8px",
              padding:        "15px",
              borderRadius:   "0.875rem",
              background:     "#25d366",
              color:          "#ffffff",
              fontWeight:     700,
              fontSize:       "0.95rem",
              border:         "none",
              cursor:         "pointer",
              boxShadow:      "0 2px 16px rgba(37,211,102,0.4)",
            }}
          >
            <MessageCircle size={18} />
            Request a Property on WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Property card ── */
function PropertyCard({
  property: p,
  onSelect,
}: {
  property: PropertyListItem;
  onSelect: (id: string) => void;
}) {
  const units: any[]  = (p as any).units ?? [];
  const isCompound    = (p as any).isCompound;
  const lowestPrice   = units.length
    ? Math.min(...units.map((u: any) => Number(u.price)))
    : null;

  const price = isCompound && lowestPrice !== null
    ? `from GH₵ ${lowestPrice.toLocaleString()}`
    : `GH₵ ${Number(p.price ?? 0).toLocaleString()}`;

  const isRent   = p.listingType === "rent";
  const location = [p.area, p.city, p.region].filter(Boolean).join(", ") || "Ghana";

  return (
    <button
      onClick={() => onSelect(String(p.id))}
      type="button"
      style={{
        width:        "100%",
        textAlign:    "left",
        borderRadius: "1rem",
        background:   "var(--surface)",
        border:       "1.5px solid var(--border-col)",
        boxShadow:    "0 2px 8px rgba(0,0,0,0.06)",
        padding:      "14px 16px",
        cursor:       "pointer",
        display:      "block",
      }}
    >
      <div
        style={{
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "space-between",
          gap:            "12px",
        }}
      >
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin:       0,
              fontWeight:   700,
              fontSize:     "0.9rem",
              color:        "var(--text-main)",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}
          >
            {p.title}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <MapPin size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span
              style={{
                fontSize:     "0.75rem",
                color:        "var(--text-muted)",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
              }}
            >
              {location}
            </span>
          </div>

          {p.propertyType && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
              <Home size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                {p.propertyType}
              </span>
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: "0.95rem", color: "#059669" }}>
            {price}
          </p>
          <span
            style={{
              display:      "inline-block",
              marginTop:    "4px",
              padding:      "2px 10px",
              borderRadius: "999px",
              fontSize:     "0.72rem",
              fontWeight:   700,
              background:   isRent ? "#dc2626" : "#16a34a",
              color:        "#ffffff",
            }}
          >
            {isRent ? "Rent" : "Sale"}
          </span>
        </div>
      </div>
    </button>
  );
}