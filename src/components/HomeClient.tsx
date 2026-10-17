"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import TabBar, { Tab } from "@/components/TabBar";
import PropertySheet from "@/components/PropertySheet";
import FavouritesTab from "@/components/FavouritesTab";
import ProfileTab from "@/components/ProfileTab";
import SettingsTab from "@/components/SettingsTab";
import AuthModal from "@/components/AuthModal";
import NavigationPage from "@/components/NavigationPage";
import type { PropertyListItem, PropertyFilters } from "@/lib/types";
import { distanceMetres } from "@/lib/geo";
import { SlidersHorizontal, Locate, Plus } from "lucide-react";
import Link from "next/link";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Props { initial: PropertyListItem[]; }

/* ══════════════════════════════════════════════════
   Auth gate — shown when user is not logged in
══════════════════════════════════════════════════ */
function AuthGate() {
  const [showAuth, setShowAuth] = useState(false);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 z-50 gap-6 px-8"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Logo & name */}
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-emerald-600 mb-1">Ghana House Agent</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Find &amp; list properties across Ghana</p>
      </div>

      <div className="w-24 h-24 rounded-3xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-5xl shadow-inner">
        🏠
      </div>

      <p className="text-zinc-600 dark:text-zinc-400 text-center text-sm leading-relaxed">
        Sign in or create an account to browse listings, save favourites, and list your property.
      </p>

      <button
        onClick={() => setShowAuth(true)}
        className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-2xl transition-colors text-base shadow-lg"
      >
        Sign In / Create Account
      </button>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Main export
══════════════════════════════════════════════════ */
export default function HomeClient({ initial }: Props) {
  const { user } = useAuth();
  if (!user) return <AuthGate />;
  return <AppShell initial={initial} />;
}

/* ══════════════════════════════════════════════════
   App shell (only rendered when logged in)
══════════════════════════════════════════════════ */
function AppShell({ initial }: Props) {
  const [properties,    setProperties]    = useState<PropertyListItem[]>(initial);
  const [selectedId,    setSelectedId]    = useState<number | null>(null);
  const [tab,           setTab]           = useState<Tab>("map");
  const [filters,       setFilters]       = useState<PropertyFilters>({});
  const [locateSignal,  setLocateSignal]  = useState(0);
  const [userPos,       setUserPos]       = useState<{ lat: number; lng: number } | null>(null);
  const [navigatingTo,  setNavigatingTo]  = useState<{ name: string; lat: number; lng: number } | null>(null);

  const userPosRef   = useRef<{ lat: number; lng: number } | null>(null);
  const notifiedRef  = useRef<Set<number>>(new Set());

  /* ── Fetch properties ── */
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.listing) params.set("listing", filters.listing);
    if (filters.type)    params.set("type",    filters.type);
    if (filters.region)  params.set("region",  filters.region);
    if (filters.beds)    params.set("beds",    String(filters.beds));

    fetch(`/api/properties?${params}`)
      .then(r => r.json())
      .then(d => setProperties(d.properties ?? []))
      .catch(() => {});
  }, [filters]);

  /* ── Geofence notifications ── */
  const handleUserLocation = useCallback(async (lat: number, lng: number) => {
    userPosRef.current = { lat, lng };
    setUserPos({ lat, lng });

    if (typeof window === "undefined") return;
    if (localStorage.getItem("gha_notif") !== "true") return;

    const { LocalNotifications } = await import("@capacitor/local-notifications");
    for (const p of properties) {
      if (p.lat === null || p.lng === null) continue;
      if (notifiedRef.current.has(p.id)) continue;
      const d = distanceMetres(lat, lng, p.lat!, p.lng!);
      if (d <= 300) {
        notifiedRef.current.add(p.id);
        await LocalNotifications.schedule({
          notifications: [{
            id:    p.id,
            title: "Nearby Property 🏠",
            body:  `${p.title} is within 300 m of you!`,
            // No custom sound — follows system default
          }],
        });
      }
    }
  }, [properties]);

  const selected = properties.find(p => p.id === selectedId) ?? null;

  /* ── Navigate to property handler ── */
  const handleNavigate = useCallback((dest: { name: string; lat: number; lng: number }) => {
    setSelectedId(null);
    setNavigatingTo(dest);
  }, []);

  /* ── Full-screen NavigationPage ── */
  if (navigatingTo) {
    return (
      <NavigationPage
        onBack={() => setNavigatingTo(null)}
        userLocation={userPos}
        initialDestination={navigatingTo}
      />
    );
  }

  /* ── Main UI ── */
  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-100 dark:bg-zinc-950">

      {/* ── App header ── */}
      <header
        className="flex-none bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 z-[999]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(52px + env(safe-area-inset-top))",
        }}
      >
        <h1 className="font-display text-xl font-bold text-emerald-600 flex-1 tracking-tight">
          Ghana House Agent
        </h1>
        {tab === "map" && (
          <button
            onClick={() => setLocateSignal(s => s + 1)}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
            aria-label="Locate me"
          >
            <Locate size={18} className="text-zinc-600 dark:text-zinc-300" />
          </button>
        )}
      </header>

      {/* ── Content ── */}
      <main
        className="flex-1 relative overflow-hidden"
        style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
      >
        {/* MAP */}
        <div className={`absolute inset-0 ${tab === "map" ? "block" : "hidden"}`}>
          <MapView
            properties={properties}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUserLocation={handleUserLocation}
            locateSignal={locateSignal}
          />

          {/* Filter chips */}
          <div className="absolute top-3 left-3 right-3 z-[500]">
            <FilterBar filters={filters} onChange={setFilters} />
          </div>

          {/* List Property FAB */}
          <Link
            href="/list"
            className="absolute z-[500] right-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-3 rounded-2xl shadow-lg transition-colors"
            style={{ bottom: "76px" }}
          >
            <Plus size={18} />
            <span className="text-sm">List Property</span>
          </Link>
        </div>

        {/* SAVED */}
        {tab === "saved" && (
          <div className="absolute inset-0 overflow-y-auto">
            <FavouritesTab onSelect={(id) => { setSelectedId(id); setTab("map"); }} />
          </div>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="absolute inset-0 overflow-y-auto">
            <ProfileTab />
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="absolute inset-0 overflow-y-auto">
            <SettingsTab />
          </div>
        )}
      </main>

      {/* ── Tab bar ── */}
      <TabBar active={tab} onChange={setTab} />

      {/* ── Property sheet ── */}
      {selected && (
        <PropertySheet
          property={selected}
          onClose={() => setSelectedId(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}

/* ── Filter bar ── */
function FilterBar({
  filters, onChange,
}: { filters: PropertyFilters; onChange: (f: PropertyFilters) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      <button className="flex-none flex items-center gap-1 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-full shadow text-xs font-medium text-zinc-700 dark:text-zinc-200">
        <SlidersHorizontal size={13} /> Filter
      </button>
      {(["rent","sale"] as const).map(l => (
        <button key={l}
          onClick={() => onChange({ ...filters, listing: filters.listing === l ? undefined : l })}
          className={`flex-none px-3 py-1.5 rounded-full shadow text-xs font-medium capitalize transition-colors ${
            filters.listing === l
              ? "bg-emerald-600 text-white"
              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
          }`}>
          {l === "rent" ? "🔴 Rent" : "🟢 Sale"}
        </button>
      ))}
    </div>
  );
}