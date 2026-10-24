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
import SearchOverlay from "@/components/SearchOverlay";
import ParameterSearchPage from "@/components/ParameterSearchPage";
import SearchResultsPage from "@/components/SearchResultsPage";
import type { PropertyListItem, PropertyFilters } from "@/lib/types";
import type { PropertySearchParams } from "@/components/SearchOverlay";
import { distanceMetres } from "@/lib/geo";
import { SlidersHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useBackButton } from "@/hooks/useBackButton";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Props { initial?: PropertyListItem[] }

/* ══════════════════════════════════════
   Splash
══════════════════════════════════════ */
function Splash() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[9999]"
      style={{
        background:    "var(--bg)",
        paddingTop:    "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="text-5xl mb-4">🏠</div>
      <h1
        style={{
          fontFamily: "var(--font-fraunces, Georgia, serif)",
          fontWeight: 700,
          fontSize:   "1.8rem",
          color:      "#059669",
        }}
      >
        Ghana House Agent
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
        Loading…
      </p>
    </div>
  );
}

/* ══════════════════════════════════════
   Auth gate
══════════════════════════════════════ */
function AuthGate() {
  const [showAuth, setShowAuth] = useState(false);
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[9999] px-8 gap-6"
      style={{
        background:    "var(--bg)",
        paddingTop:    "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="text-center">
        <h1
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontWeight: 700,
            fontSize:   "2.2rem",
            color:      "#059669",
            lineHeight: 1.1,
          }}
        >
          Ghana House Agent
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Find &amp; list properties across Ghana
        </p>
      </div>
      <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl shadow-inner"
        style={{ background: "var(--surface-2)" }}
      >
        🏠
      </div>
      <p className="text-sm text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Sign in or create an account to browse listings, save favourites, and list your property.
      </p>
      <button
        onClick={() => setShowAuth(true)}
        className="w-full max-w-xs font-semibold py-4 rounded-2xl text-base shadow-lg"
        style={{ background: "#059669", color: "#fff" }}
      >
        Sign In / Create Account
      </button>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════
   Main export — THIS IS THE DEFAULT EXPORT
══════════════════════════════════════ */
export default function HomeClient({ initial }: Props) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user)   return <AuthGate />;
  return <AppShell initial={initial} />;
}

/* ══════════════════════════════════════
   App shell — internal, not exported
══════════════════════════════════════ */
function AppShell({ initial }: Props) {
  const [properties,   setProperties]   = useState<PropertyListItem[]>(initial ?? []);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [tab,          setTab]          = useState<Tab>("map");
  const [filters,      setFilters]      = useState<PropertyFilters>({});
  const [locateSignal, setLocateSignal] = useState(0);
  const [flyToSignal,  setFlyToSignal]  = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [userPos,      setUserPos]      = useState<{ lat: number; lng: number } | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<{ name: string; lat: number; lng: number } | null>(null);

  /* ── Search state ── */
  const [searchOpen,        setSearchOpen]        = useState(false);
  const [paramSearchOpen,   setParamSearchOpen]   = useState(false);
  const [searchResults,     setSearchResults]     = useState<PropertyListItem[] | null>(null);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [lastParams,        setLastParams]        = useState<PropertySearchParams>({});

  /* Profile sub-section lifted for back-button control */
  const [profileSection, setProfileSection] = useState<"info" | "listings">("info");

  const notifiedRef = useRef<Set<string>>(new Set());

  /* ── Fetch map properties ── */
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
    const id = setInterval(fetchProps, 30_000);
    return () => clearInterval(id);
  }, [fetchProps]);

  /* ── Parameter search → fetch results ── */
  const handleDatabaseSearch = useCallback(async (params: PropertySearchParams) => {
    setLastParams(params);
    setParamSearchOpen(false);
    const qs = new URLSearchParams();
    if (params.area)     qs.set("area",     params.area);
    if (params.type)     qs.set("type",     params.type ?? "");
    if (params.listing)  qs.set("listing",  params.listing);
    if (params.minPrice) qs.set("minPrice", params.minPrice);
    if (params.maxPrice) qs.set("maxPrice", params.maxPrice);
    try {
      const r = await fetch(`/api/properties?${qs}`);
      const d = await r.json();
      setSearchResults(Array.isArray(d?.properties) ? d.properties : []);
    } catch {
      setSearchResults([]);
    }
    setSearchResultsOpen(true);
  }, []);

  /* ── Select a house from the results list ── */
  const handleSelectFromResults = useCallback((id: string) => {
    setSearchResultsOpen(false);
    setSearchOpen(false);
    setSelectedId(id);
    setTab("map");
  }, []);

  /* ── Geofence notifications ── */
  const handleUserLocation = useCallback(async (lat: number, lng: number) => {
    setUserPos({ lat, lng });
    if (typeof window === "undefined") return;
    if (localStorage.getItem("gha_notif") !== "true") return;
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      for (const p of properties) {
        if (p.lat == null || p.lng == null) continue;
        const sid = String(p.id);
        if (notifiedRef.current.has(sid)) continue;
        if (distanceMetres(lat, lng, p.lat, p.lng) <= 300) {
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
    } catch { /* browser — ignore */ }
  }, [properties]);

  const selected = properties.find(p => String(p.id) === selectedId) ?? null;

  const handleNavigate = useCallback((dest: { name: string; lat: number; lng: number }) => {
    setSelectedId(null);
    setNavigatingTo(dest);
  }, []);

  /* ── Close search overlays when a pin is tapped ── */
  useEffect(() => {
    if (selectedId) { setSearchOpen(false); setParamSearchOpen(false); }
  }, [selectedId]);

  /* ══════════════════════════════════════════════════
     Back-button callbacks — named & hoisted so they
     are stable references passed to useBackButton
  ══════════════════════════════════════════════════ */
  const cbCloseResults     = useCallback(() => setSearchResultsOpen(false), []);
  const cbCloseParamSearch = useCallback(() => setParamSearchOpen(false),   []);
  const cbCloseSearch      = useCallback(() => setSearchOpen(false),        []);
  const cbCloseNav         = useCallback(() => setNavigatingTo(null),       []);
  const cbCloseSheet       = useCallback(() => setSelectedId(null),         []);
  const cbProfileToInfo    = useCallback(() => setProfileSection("info"),   []);
  const cbGoToMap          = useCallback(() => setTab("map"),               []);

  /* ══════════════════════════════════════════════════
     Back-button priority stack
     70 – search results page
     60 – parameter search form
     50 – compact search overlay
     40 – navigation page
     30 – property sheet
     21 – profile listings → profile info
     20 – any non-map tab → map
      0 – map root → double-tap exit
  ══════════════════════════════════════════════════ */
  useBackButton(searchResultsOpen, cbCloseResults,     "search-results",  70);
  useBackButton(paramSearchOpen,   cbCloseParamSearch, "param-search",    60);
  useBackButton(searchOpen,        cbCloseSearch,      "search-overlay",  50);
  useBackButton(!!navigatingTo,    cbCloseNav,         "navigation-page", 40);
  useBackButton(!!selectedId,      cbCloseSheet,       "property-sheet",  30);

  useBackButton(
    tab === "profile" &&
      profileSection === "listings" &&
      !selectedId && !navigatingTo &&
      !searchOpen && !paramSearchOpen && !searchResultsOpen,
    cbProfileToInfo,
    "profile-listings",
    21,
  );

  useBackButton(
    tab !== "map" &&
      !selectedId && !navigatingTo &&
      !searchOpen && !paramSearchOpen && !searchResultsOpen &&
      !(tab === "profile" && profileSection === "listings"),
    cbGoToMap,
    "tab-switch",
    20,
  );

  /* ── Navigation full-screen overlay ── */
  if (navigatingTo) {
    return (
      <NavigationPage
        onBack={() => setNavigatingTo(null)}
        userLocation={userPos}
        initialDestination={navigatingTo}
      />
    );
  }

  const sheetOpen = !!selectedId;

  /* ══════════════════════════════════════════════════
     Render
  ══════════════════════════════════════════════════ */
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* ── Header ───────────────────────────────────── */}
      <header
        className="flex-none flex items-center gap-2 px-4"
        style={{
          paddingTop:    "calc(env(safe-area-inset-top) + 12px)",
          paddingBottom: "12px",
          background:    "var(--surface)",
          borderBottom:  "1px solid var(--border-col)",
          zIndex:        999,
        }}
      >
        <h1
          className="flex-1 tracking-tight"
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontWeight: 700,
            fontSize:   "1.25rem",
            color:      "#059669",
          }}
        >
          Ghana House Agent
        </h1>

        {/* Search button — map tab only, no open sheet */}
        {tab === "map" && !sheetOpen && (
          <button
            onClick={() => setSearchOpen(o => !o)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface-2)" }}
            aria-label="Search"
          >
            <Search size={17} style={{ color: "var(--text-muted)" }} />
          </button>
        )}
      </header>

      {/* ── Content area ─────────────────────────────── */}
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
  flyToSignal={flyToSignal}
  hideControls={sheetOpen || paramSearchOpen || searchResultsOpen}
/>

          {/* Compact search overlay */}
          {searchOpen && !sheetOpen && (
            <SearchOverlay
              onClose={() => setSearchOpen(false)}
              onFlyTo={(lat, lng, zoom) => {
                setFlyToSignal({ lat, lng, zoom });
                setSearchOpen(false);
              }}
              onOpenParamSearch={() => {
                setSearchOpen(false);
                setParamSearchOpen(true);
              }}
            />
          )}

          {/* Filter chips */}
          {!sheetOpen && !searchOpen && (
            <div className="absolute top-3 left-3 right-3 z-[500]">
              <FilterBar filters={filters} onChange={setFilters} />
            </div>
          )}

          {/* List Property FAB */}
          {!sheetOpen && (
            <div
              className="absolute left-3 right-3 z-[500] flex justify-end"
              style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}
            >
              <Link
                href="/list"
                className="flex items-center gap-2 font-semibold px-5 py-3 rounded-2xl shadow-xl"
                style={{ background: "#059669", color: "#fff" }}
              >
                <Plus size={18} />
                <span className="text-sm">List Property</span>
              </Link>
            </div>
          )}
        </div>

        {/* FAVOURITES TAB */}
        {tab === "favourites" && (
          <div
            className="absolute inset-0 overflow-y-auto thin-scroll"
            style={{
              paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
              background:    "var(--bg)",
            }}
          >
            <FavouritesTab
              onSelect={id => { setSelectedId(String(id)); setTab("map"); }}
            />
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div
            className="absolute inset-0 overflow-y-auto thin-scroll"
            style={{
              paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
              background:    "var(--bg)",
            }}
          >
            <ProfileTab
              onRefresh={fetchProps}
              section={profileSection}
              onSectionChange={setProfileSection}
            />
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div
            className="absolute inset-0 overflow-y-auto thin-scroll"
            style={{
              paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
              background:    "var(--bg)",
            }}
          >
            <SettingsTab />
          </div>
        )}
      </main>

      {/* ── Tab bar ──────────────────────────────────── */}
      <TabBar
        active={tab}
        onChange={t => { setTab(t); setProfileSection("info"); }}
      />

      {/* ── Property sheet ───────────────────────────── */}
      {selected && (
        <PropertySheet
          property={selected}
          onClose={() => setSelectedId(null)}
          onNavigate={handleNavigate}
        />
      )}

      {/* ── Full-screen parameter search ─────────────── */}
      {paramSearchOpen && (
        <ParameterSearchPage
          onBack={() => setParamSearchOpen(false)}
          onSearch={handleDatabaseSearch}
        />
      )}

      {/* ── Full-screen search results ───────────────── */}
      {searchResultsOpen && searchResults !== null && (
        <SearchResultsPage
          params={lastParams}
          results={searchResults}
          onBack={() => setSearchResultsOpen(false)}
          onSelect={handleSelectFromResults}
        />
      )}
    </div>
  );
}

/* ── Filter bar ────────────────────────────────────── */
function FilterBar({
  filters,
  onChange,
}: {
  filters:  PropertyFilters;
  onChange: (f: PropertyFilters) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <button
        className="flex-none flex items-center gap-1 px-3 py-1.5 rounded-full shadow text-xs font-medium"
        style={{ background: "var(--surface)", color: "var(--text-muted)" }}
        type="button"
      >
        <SlidersHorizontal size={13} /> Filter
      </button>
      {(["rent", "sale"] as const).map(l => (
        <button
          key={l}
          type="button"
          onClick={() =>
            onChange({ ...filters, listing: filters.listing === l ? undefined : l })
          }
          className="flex-none px-3 py-1.5 rounded-full shadow text-xs font-medium capitalize transition-colors"
          style={{
            background: filters.listing === l ? "#059669"          : "var(--surface)",
            color:      filters.listing === l ? "#fff"             : "var(--text-muted)",
          }}
        >
          {l === "rent" ? "🔴 Rent" : "🟢 Sale"}
        </button>
      ))}
    </div>
  );
}