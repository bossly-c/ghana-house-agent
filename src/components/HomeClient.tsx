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
   Splash — shown while JWT is being read
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
   Auth gate — first screen for unauthenticated users
══════════════════════════════════════════════════ */
function AuthGate() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 z-[9999] px-8 gap-6"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* App name — inline style so it works even if Tailwind utility isn't ready */}
      <div className="text-center">
        <h1
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontWeight: 700,
            fontSize: "2.2rem",
            color: "#059669",
            lineHeight: 1.1,
          }}
        >
          Ghana House Agent
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Find &amp; list properties across Ghana
        </p>
      </div>

      {/* Icon */}
      <div className="w-28 h-28 rounded-3xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-6xl shadow-inner">
        🏠
      </div>

      <p className="text-zinc-600 dark:text-zinc-400 text-center text-sm leading-relaxed">
        Sign in or create an account to browse listings,
        save favourites, and list your property.
      </p>

      <button
        onClick={() => setShowAuth(true)}
        className="w-full max-w-xs text-white font-semibold py-4 rounded-2xl transition-colors text-base shadow-lg"
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

  // While JWT is being read from localStorage — show splash
  if (loading) return <Splash />;

  // Not logged in — show auth gate (sign in page)
  if (!user) return <AuthGate />;

  // Logged in — show the app
  return <AppShell initial={initial} />;
}

/* ══════════════════════════════════════════════════
   App shell (only rendered when logged in)
══════════════════════════════════════════════════ */
function AppShell({ initial }: Props) {
  const [properties,   setProperties]   = useState<PropertyListItem[]>(initial);
  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [tab,          setTab]          = useState<Tab>("map");
  const [filters,      setFilters]      = useState<PropertyFilters>({});
  const [locateSignal, setLocateSignal] = useState(0);
  const [userPos,      setUserPos]      = useState<{ lat: number; lng: number } | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const notifiedRef = useRef<Set<number>>(new Set());

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
          }],
        });
      }
    }
  }, [properties]);

  const selected = properties.find(p => p.id === selectedId) ?? null;

  const handleNavigate = useCallback((dest: { name: string; lat: number; lng: number }) => {
    setSelectedId(null);
    setNavigatingTo(dest);
  }, []);

  /* ── Full-screen navigation ── */
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
        style={{
          paddingTop:    "env(safe-area-inset-top)",
          paddingBottom: "12px",
          zIndex:        999,
        }}
      >
        {/* Inline style used here so the name renders even before CSS loads */}
        <h1
          className="flex-1 tracking-tight"
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontWeight: 700,
            fontSize:   "1.25rem",
            color:      "#059669",
            paddingTop: "12px",
          }}
        >
          Ghana House Agent
        </h1>

        {tab === "map" && (
          <button
            onClick={() => setLocateSignal(s => s + 1)}
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mt-3"
            aria-label="Locate me"
          >
            <Locate size={18} className="text-zinc-600 dark:text-zinc-300" />
          </button>
        )}
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
            onSelect={setSelectedId}
            onUserLocation={handleUserLocation}
            locateSignal={locateSignal}
          />

          {/* Filter chips — sit over map, below zoom */}
          <div className="absolute top-3 left-3 right-16 z-[500]">
            <FilterBar filters={filters} onChange={setFilters} />
          </div>

          {/* ── List Property button ── */}
          <div
            className="absolute left-3 right-3 z-[500] flex justify-end"
            style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}
          >
            <Link
              href="/list"
              className="flex items-center gap-2 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl transition-colors"
              style={{ background: "#059669" }}
            >
              <Plus size={18} />
              <span className="text-sm">List Property</span>
            </Link>
          </div>
        </div>

        {/* SAVED TAB */}
        {tab === "saved" && (
          <div
            className="absolute inset-0 overflow-y-auto"
            style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
          >
            <FavouritesTab onSelect={id => { setSelectedId(id); setTab("map"); }} />
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div
            className="absolute inset-0 overflow-y-auto"
            style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
          >
            <ProfileTab />
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div
            className="absolute inset-0 overflow-y-auto"
            style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
          >
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
    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <button className="flex-none flex items-center gap-1 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-full shadow text-xs font-medium text-zinc-700 dark:text-zinc-200">
        <SlidersHorizontal size={13} /> Filter
      </button>
      {(["rent", "sale"] as const).map(l => (
        <button key={l}
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