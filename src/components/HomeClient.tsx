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
import { SlidersHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useBackButton } from "@/hooks/useBackButton";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Props { initial?: PropertyListItem[] }

/* ══════════════════════════════════════════════════
   Splash
══════════════════════════════════════════════════ */
function Splash() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 z-[9999]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="text-5xl mb-4">🏠</div>
      <h1 style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontWeight: 700, fontSize: "1.8rem", color: "#059669" }}>
        Ghana House Agent
      </h1>
      <p className="text-zinc-400 text-sm mt-2">Loading…</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Auth gate
══════════════════════════════════════════════════ */
function AuthGate() {
  const [showAuth, setShowAuth] = useState(false);
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 z-[9999] px-8 gap-6"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="text-center">
        <h1 style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontWeight: 700, fontSize: "2.2rem", color: "#059669", lineHeight: 1.1 }}>
          Ghana House Agent
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Find &amp; list properties across Ghana
        </p>
      </div>
      <div className="w-28 h-28 rounded-3xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-6xl shadow-inner">
        🏠
      </div>
      <p className="text-zinc-600 dark:text-zinc-400 text-center text-sm leading-relaxed">
        Sign in or create an account to browse listings, save favourites, and list your property.
      </p>
      <button
        onClick={() => setShowAuth(true)}
        className="w-full max-w-xs text-white font-semibold py-4 rounded-2xl text-base shadow-lg"
        style={{ background: "#059669" }}
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
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user)   return <AuthGate />;
  return <AppShell initial={initial} />;
}

/* ══════════════════════════════════════════════════
   App shell
══════════════════════════════════════════════════ */
function AppShell({ initial }: Props) {
  const [properties,   setProperties]   = useState<PropertyListItem[]>(initial ?? []);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [tab,          setTab]          = useState<Tab>("map");
  const [filters,      setFilters]      = useState<PropertyFilters>({});
  const [locateSignal, setLocateSignal] = useState(0);
  const [userPos,      setUserPos]      = useState<{ lat: number; lng: number } | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const notifiedRef = useRef<Set<string>>(new Set());

  /* ── Fetch properties (initial + polling every 30s) ── */
  const fetchProps = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.listing) params.set("listing", filters.listing);
    if (filters.type)    params.set("type",    filters.type);
    if (filters.region)  params.set("region",  filters.region);
    if (filters.beds)    params.set("beds",    String(filters.beds));
    try {
      const r = await fetch(`/api/properties?${params}`);
      const d = await r.json();
      setProperties(Array.isArray(d?.properties) ? d.properties : []);
    } catch { /* ignore */ }
  }, [filters]);

  useEffect(() => {
    fetchProps();
    const interval = setInterval(fetchProps, 30_000);
    return () => clearInterval(interval);
  }, [fetchProps]);

  /* ── Geofence notifications ── */
  const handleUserLocation = useCallback(async (lat: number, lng: number) => {
    setUserPos({ lat, lng });
    if (typeof window === "undefined") return;
    if (localStorage.getItem("gha_notif") !== "true") return;

    const { LocalNotifications } = await import("@capacitor/local-notifications");
    for (const p of properties) {
      if (p.lat === null || p.lng === null) continue;
      const sid = String(p.id);
      if (notifiedRef.current.has(sid)) continue;
      const d = distanceMetres(lat, lng, p.lat!, p.lng!);
      if (d <= 300) {
        notifiedRef.current.add(sid);
        await LocalNotifications.schedule({
          notifications: [{
            id:    Number(p.id),
            title: "Nearby Property 🏠",
            body:  `${p.title} is within 300 m of you!`,
          }],
        });
      }
    }
  }, [properties]);

  const selected = properties.find(p => String(p.id) === selectedId) ?? null;

  const handleNavigate = useCallback((dest: { name: string; lat: number; lng: number }) => {
    setSelectedId(null);
    setNavigatingTo(dest);
  }, []);

  /* ══════════════════════════════════════════════════
     Back button — priority stack
     30 = navigation page (highest)
     20 = property sheet
     10 = non-map tab
     0  = map root → double-tap exits (handled by hook system itself)
  ══════════════════════════════════════════════════ */

  // Priority 30 — Navigation overlay
  useBackButton(
    !!navigatingTo,
    useCallback(() => setNavigatingTo(null), []),
    "navigation-page",
    30
  );

  // Priority 20 — Property sheet
  useBackButton(
    !!selectedId,
    useCallback(() => setSelectedId(null), []),
    "property-sheet",
    20
  );

  // Priority 10 — Non-map tab → return to map
  useBackButton(
    tab !== "map" && !selectedId && !navigatingTo,
    useCallback(() => setTab("map"), []),
    "tab-switch",
    10
  );

  /* ── Full-screen navigation overlay ── */
  if (navigatingTo) {
    return (
      <NavigationPage
        onBack={() => setNavigatingTo(null)}
        userLocation={userPos}
        initialDestination={navigatingTo}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-100 dark:bg-zinc-950">

      {/* ── App name header ── */}
      <header
        className="flex-none bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: "12px", zIndex: 999 }}
      >
        <h1
          className="flex-1 tracking-tight"
          style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontWeight: 700, fontSize: "1.25rem", color: "#059669" }}
        >
          Ghana House Agent
        </h1>
      </header>

      {/* ── Content area ── */}
      <main className="flex-1 relative overflow-hidden">

        {/* MAP TAB */}
        <div
          className={`absolute inset-0 ${tab === "map" ? "block" : "hidden"}`}
          style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
        >
                    <MapView
            properties={properties}
            selectedId={selectedId}
            onSelect={id => setSelectedId(id)}
            onUserLocation={handleUserLocation}
            locateSignal={locateSignal}
            hideControls={!!selectedId}
          />

          {/* Filter chips — hidden when sheet is open so they don't clash */}
          {!selectedId && (
            <div className="absolute top-3 left-3 right-3 z-[500]">
              <FilterBar filters={filters} onChange={setFilters} />
            </div>
          )}

          {/* List Property FAB — hidden when sheet is open */}
          {!selectedId && (
            <div
              className="absolute left-3 right-3 z-[500] flex justify-end"
              style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}
            >
              <Link
                href="/list"
                className="flex items-center gap-2 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl"
                style={{ background: "#059669" }}
              >
                <Plus size={18} />
                <span className="text-sm">List Property</span>
              </Link>
            </div>
          )}
        </div>

        {/* FAVOURITES TAB */}
        {tab === "favourites" && (
          <div className="absolute inset-0 overflow-y-auto" style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
            <FavouritesTab onSelect={id => { setSelectedId(String(id)); setTab("map"); }} />
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="absolute inset-0 overflow-y-auto" style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
            <ProfileTab onRefresh={fetchProps} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="absolute inset-0 overflow-y-auto" style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
            <SettingsTab />
          </div>
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />

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
function FilterBar({ filters, onChange }: { filters: PropertyFilters; onChange: (f: PropertyFilters) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <button className="flex-none flex items-center gap-1 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-full shadow text-xs font-medium text-zinc-700 dark:text-zinc-200">
        <SlidersHorizontal size={13} /> Filter
      </button>
      {(["rent", "sale"] as const).map(l => (
        <button
          key={l}
          onClick={() => onChange({ ...filters, listing: filters.listing === l ? undefined : l })}
          className="flex-none px-3 py-1.5 rounded-full shadow text-xs font-medium capitalize transition-colors"
          style={{
            background: filters.listing === l ? "#059669" : "white",
            color:      filters.listing === l ? "white"    : "#3f3f46",
          }}
        >
          {l === "rent" ? "🔴 Rent" : "🟢 Sale"}
        </button>
      ))}
    </div>
  );
}