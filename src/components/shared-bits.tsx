"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import {
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircle,
  Phone,
  Sofa,
  Check,
  MapPin,
  Eye,
} from "lucide-react";
import type { PropertyDetail } from "@/lib/types";
import { LISTING_COLORS } from "@/lib/constants";

// ---------------------------------------------------------------- badges
export function ListingBadge({
  listing,
  size = "md",
}: {
  listing: "rent" | "sale";
  size?: "sm" | "md";
}) {
  const c = LISTING_COLORS[listing];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide ${
        size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
      }`}
      style={{ backgroundColor: c.soft, color: c.main }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.main }}
      />
      For {listing === "rent" ? "Rent" : "Sale"}
    </span>
  );
}

// ---------------------------------------------------------------- gallery
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const go = useCallback(
    (dir: 1 | -1) => {
      const el = scrollRef.current;
      if (!el) return;
      const next = Math.min(
        images.length - 1,
        Math.max(0, Math.round(el.scrollLeft / el.clientWidth) + dir)
      );
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    },
    [images.length]
  );

  if (images.length === 0) {
    return (
      <div className="flex h-60 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-brand-100 text-brand-500">
        <Home className="h-10 w-10" />
        <p className="text-xs font-semibold">Photos coming soon</p>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="no-scrollbar flex h-60 w-full snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth rounded-2xl sm:h-72"
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${title} — photo ${i + 1}`}
            className="h-full w-full shrink-0 snap-center object-cover"
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-black/45 to-transparent" />

      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
        {index + 1} / {images.length}
      </span>

      {images.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-900 shadow-md transition hover:bg-white group-hover:block"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-900 shadow-md transition hover:bg-white group-hover:block"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-gold-400" : "w-1.5 bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- key stats
export function KeyStats({ p }: { p: PropertyDetail }) {
  const items: { icon: ReactNode; value: number | string; label: string }[] = [];

  // ← use p.beds / p.baths / p.halls — the actual PropertyDetail field names
  if (p.beds > 0)
    items.push({
      icon: <BedDouble className="h-4.5 w-4.5" />,
      value: p.beds,
      label: p.beds > 1 ? "Bedrooms" : "Bedroom",
    });
  if (p.halls > 0)
    items.push({
      icon: <Sofa className="h-4.5 w-4.5" />,
      value: p.halls,
      label: p.halls > 1 ? "Halls" : "Hall",
    });
  if (p.baths > 0)
    items.push({
      icon: <Bath className="h-4.5 w-4.5" />,
      value: p.baths,
      label: p.baths > 1 ? "Bathrooms" : "Bathroom",
    });

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1 rounded-xl border border-brand-100 bg-cream-50 px-2 py-3 text-center"
        >
          <span className="text-brand-600">{it.icon}</span>
          <span className="text-sm font-extrabold text-brand-950">{it.value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- agent card
export function AgentCard({ p }: { p: PropertyDetail }) {
  // ← use agentPhone / agentWhatsApp / agentName — flat fields on PropertyDetail
  const phone = p.agentPhone ?? "";
  const wa = (p.agentWhatsApp || phone).replace(/\D/g, "").replace(/^0/, "233");
  const name = p.agentName ?? "Agent";

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0c3b2e&color=f2b70a&bold=true`}
          alt={name}
          className="h-12 w-12 rounded-full border-2 border-gold-400 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-brand-950">
            {name}
          </p>
          <p className="text-xs font-medium text-brand-500">
            Property agent · Ghana
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label="Call agent"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800 text-cream-50 shadow-sm transition hover:bg-brand-700 active:scale-95"
            >
              <Phone className="h-4.5 w-4.5" />
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(
                `Hello ${name}, I saw "${p.title}" on Ghana House Agent and I'm interested.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-white shadow-sm transition hover:brightness-95 active:scale-95"
            >
              <MessageCircle className="h-4.5 w-4.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- amenities
export function Amenities({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <span
          key={a}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-brand-800"
        >
          <Check className="h-3.5 w-3.5 text-brand-500" />
          {a}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- meta lines
export function LocationLine({
  p,
  className = "",
}: {
  p: { area: string; city: string; region: string };
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <MapPin className="h-4 w-4 shrink-0 text-rent" />
      <span className="truncate">
        {p.area} · {p.city}, {p.region}
      </span>
    </span>
  );
}

export function ViewsLine({ views }: { views: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400">
      <Eye className="h-3.5 w-3.5" />
      {views.toLocaleString()} views
    </span>
  );
}