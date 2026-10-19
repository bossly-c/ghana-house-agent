"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Share2, Bed, Bath, LayoutGrid, Phone,
  MessageCircle, MapPin, Navigation, ChevronRight, ChevronUp,
  Camera, Video, FileText, UserCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { PropertyListItem } from "@/lib/types";

const TourViewer  = dynamic(() => import("@/components/TourViewer"),  { ssr: false });
const BookingForm = dynamic(() => import("@/components/BookingForm"), { ssr: false });

interface Props {
  property:    PropertyListItem;
  onClose:     () => void;
  onNavigate?: (dest: { name: string; lat: number; lng: number }) => void;
}

type SheetView = "summary" | "tour" | "book";

/* ── Small reusable placeholder card ── */
function PlaceholderCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-7 px-4 text-center">
      <div className="text-zinc-300 dark:text-zinc-600">{icon}</div>
      <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{title}</p>
      <p className="text-xs text-zinc-400 dark:text-zinc-600">{subtitle}</p>
    </div>
  );
}

export default function PropertySheet({ property: p, onClose, onNavigate }: Props) {
  const [view,     setView]     = useState<SheetView>("summary");
  const [faved,    setFaved]    = useState(false);
  const [imgIdx,   setImgIdx]   = useState(0);
  const [expanded, setExpanded] = useState(false);

  const photos: string[] = p.photos ?? p.images ?? [];
  const hasPhotos  = photos.length > 0;
  const hasScenes  = Array.isArray(p.scenes) && p.scenes.length > 0;
  const hasDesc    = Boolean(p.description?.trim());
  const hasAgent   = Boolean(p.agentPhone || p.agentWhatsApp);

  /* ── Favourites ── */
  useEffect(() => {
    const favs: string[] = JSON.parse(localStorage.getItem("gha_favs") ?? "[]");
    setFaved(favs.includes(String(p.id)));
  }, [p.id]);

  const toggleFav = () => {
    const favs: string[] = JSON.parse(localStorage.getItem("gha_favs") ?? "[]");
    const sid  = String(p.id);
    const next = faved ? favs.filter((x) => x !== sid) : [...favs, sid];
    localStorage.setItem("gha_favs", JSON.stringify(next));
    setFaved(!faved);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/property/${p.id}`;
    if (navigator.share) await navigator.share({ title: p.title, url });
    else await navigator.clipboard.writeText(url);
  };

  const canNavigate = p.lat !== null && p.lng !== null && isFinite(p.lat!) && isFinite(p.lng!);
  const units       = p.units ?? [];
  const isCompound  = p.isCompound && units.length > 0;
  const lowestPrice = isCompound
    ? Math.min(...units.map((u) => Number(u.price)))
    : Number(p.price ?? 0);
  const priceLabel  = isCompound
    ? `from GH₵ ${lowestPrice.toLocaleString()}`
    : `GH₵ ${lowestPrice.toLocaleString()}`;

  const peekH = "56dvh";
  const fullH = "92dvh";

  return (
    <AnimatePresence>

      {/* Backdrop */}
      <motion.div
        key="sheet-backdrop"
        className="fixed inset-0 z-[900] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        className="fixed inset-x-0 bottom-0 z-[901] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        initial={{ y: "100%", height: peekH }}
        animate={{ y: 0, height: expanded ? fullH : peekH }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.25 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -60 || info.velocity.y < -400) setExpanded(true);
          else if (info.offset.y > 80 || info.velocity.y > 400) {
            if (expanded) setExpanded(false);
            else onClose();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Drag handle */}
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="mt-1">
            <ChevronUp size={16} className="text-zinc-400" />
          </motion.div>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-2 flex-none">
          <div className="flex-1 min-w-0 pr-3">
            <h2
              className="font-bold text-lg text-zinc-900 dark:text-white leading-tight line-clamp-2"
              style={{ fontFamily: "var(--font-fraunces, Georgia, serif)" }}
            >
              {p.title}
            </h2>
            {(p.area || p.city) && (
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {[p.area, p.city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Price */}
        <div className="px-4 pb-3 flex-none">
          <span
            className="font-bold leading-none text-emerald-600"
            style={{ fontSize: "2.6rem", fontFamily: "var(--font-fraunces, Georgia, serif)" }}
          >
            {priceLabel}
          </span>
          <span className="text-sm text-zinc-500 ml-2">
            {isCompound ? "/ unit" : p.listingType === "rent" ? "/ mo" : ""}
          </span>
          <span
            className={`ml-3 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              p.listingType === "rent"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            }`}
          >
            {p.listingType === "rent" ? "For Rent" : "For Sale"}
          </span>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4"
          onPointerDownCapture={(e) => e.stopPropagation()}
        >

          {/* ── Photos ── */}
          {hasPhotos ? (
            <div className="relative h-52 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[imgIdx]} alt={p.title} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === imgIdx ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ── Photo placeholder ──────────────────────────────────────────
            <PlaceholderCard
              icon={<Camera size={36} strokeWidth={1.4} />}
              title="No photos uploaded yet"
              subtitle="The owner hasn't added photos — check back soon"
            />
          )}

          {/* Stats — single property */}
          {!isCompound && (
            <div className="flex gap-3">
              {[
                { icon: <Bed size={16} />,       val: p.beds,  label: "Beds"  },
                { icon: <Bath size={16} />,       val: p.baths, label: "Baths" },
                { icon: <LayoutGrid size={16} />, val: p.halls, label: "Halls" },
              ].map(({ icon, val, label }) =>
                val !== undefined && val !== null ? (
                  <div
                    key={label}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 flex flex-col items-center gap-1"
                  >
                    <span className="text-zinc-400">{icon}</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">{val}</span>
                    <span className="text-[10px] text-zinc-500">{label}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Compound unit cards */}
          {isCompound && units.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Unit Types</p>
              {units.map((u, i) => (
                <div
                  key={i}
                  className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">{u.unitType}</p>
                    <p className="text-xs text-zinc-500">
                      {[
                        u.bedrooms  && `${u.bedrooms} bed`,
                        u.bathrooms && `${u.bathrooms} bath`,
                        u.halls     && `${u.halls} hall`,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {u.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{u.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="font-bold text-emerald-600 text-base"
                      style={{ fontFamily: "var(--font-fraunces, Georgia, serif)" }}
                    >
                      GH₵ {Number(u.price).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-zinc-400">/{u.pricePeriod ?? "mo"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Description ── */}
          {hasDesc ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {p.description}
            </p>
          ) : (
            // ── Description placeholder ────────────────────────────────────
            <PlaceholderCard
              icon={<FileText size={28} strokeWidth={1.4} />}
              title="No description yet"
              subtitle="The owner hasn't added details — contact them for more info"
            />
          )}

          {/* Get Directions */}
          {canNavigate && onNavigate && (
            <button
              onClick={() => onNavigate({ name: p.title, lat: p.lat!, lng: p.lng! })}
              className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3.5 transition-colors hover:bg-emerald-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Navigation size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Get Directions</p>
                  <p className="text-xs text-zinc-500">Navigate to this property</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>
          )}

          {/* ── Agent contact ── */}
          {hasAgent ? (
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Agent</p>
              {p.agentName && (
                <p className="font-semibold text-zinc-900 dark:text-white">{p.agentName}</p>
              )}
              <div className="flex gap-2">
                {p.agentPhone && (
                  <a
                    href={`tel:${p.agentPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm"
                  >
                    <Phone size={16} /> Call
                  </a>
                )}
                {p.agentWhatsApp && (
                  <a
                    href={`https://wa.me/${p.agentWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in: ${p.title}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-semibold text-sm"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          ) : (
            // ── Agent placeholder ──────────────────────────────────────────
            <PlaceholderCard
              icon={<UserCircle size={32} strokeWidth={1.4} />}
              title="Agent contact not provided"
              subtitle="No phone or WhatsApp listed — contact details coming soon"
            />
          )}

          {/* ── Virtual Tour ── */}
          {hasScenes ? (
            <button
              onClick={() => setView("tour")}
              className="w-full py-3.5 bg-zinc-900 dark:bg-zinc-700 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              🌐 Virtual Tour
            </button>
          ) : (
            // ── 3D Tour placeholder ────────────────────────────────────────
            <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <Video size={20} className="text-zinc-400 dark:text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                  360° Tour — Coming Soon
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  The owner hasn&apos;t uploaded a virtual tour yet
                </p>
              </div>
            </div>
          )}

          {/* Book viewing */}
          <button
            onClick={() => setView("book")}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm transition-colors"
          >
            Book a Viewing
          </button>
        </div>

        {/* Action bar */}
        <div className="flex gap-3 px-4 pt-3 pb-2 border-t border-zinc-100 dark:border-zinc-800 flex-none">
          <button
            onClick={toggleFav}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-colors ${
              faved
                ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          >
            <Heart size={20} className={faved ? "text-red-500 fill-red-500" : "text-zinc-400"} />
          </button>
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-700"
          >
            <Share2 size={20} className="text-zinc-400" />
          </button>
        </div>
      </motion.div>

      {/* Tour overlay */}
      {view === "tour" && (
        <motion.div
          key="tour"
          className="fixed inset-0 z-[1000] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            onClick={() => setView("summary")}
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center"
            style={{ marginTop: "env(safe-area-inset-top)" }}
          >
            <X size={20} className="text-white" />
          </button>
          <TourViewer scenes={p.scenes ?? []} title={p.title} />
        </motion.div>
      )}

      {/* Booking overlay */}
      {view === "book" && (
        <motion.div
          key="book"
          className="fixed inset-x-0 bottom-0 z-[1000] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl flex flex-col"
          style={{ maxHeight: "85dvh", paddingBottom: "env(safe-area-inset-bottom)" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          <div className="flex items-center justify-between p-5 flex-none">
            <h3
              className="font-bold text-lg text-zinc-900 dark:text-white"
              style={{ fontFamily: "var(--font-fraunces, Georgia, serif)" }}
            >
              Book a Viewing
            </h3>
            <button
              onClick={() => setView("summary")}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <BookingForm
              propertyId={p.id}
              viewingDays={p.viewingDays ?? []}
              viewingTime={p.viewingTime ?? "By appointment"}
              listingType={p.listingType}
              onSuccess={() => setView("summary")}
            />
          </div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}