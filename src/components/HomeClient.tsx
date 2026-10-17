"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { SlidersHorizontal, Search, X } from "lucide-react";
import TabBar, { type Tab }    from "./TabBar";
import PropertySheet           from "./PropertySheet";
import ProfileTab              from "./ProfileTab";
import SettingsTab             from "./SettingsTab";
import FavouritesTab           from "./FavouritesTab";
import { type PropertyListItem, type PropertyFilters } from "@/lib/types";
import { distanceMetres }      from "@/lib/geo";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

const NOTIF_RADIUS_M = 300;
const notifiedIds    = new Set<string>();

export default function HomeClient() {
  const [tab, setTab]               = useState<Tab>("map");
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selected, setSelected]     = useState<string | null>(null);
  const [userPos, setUserPos]       = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch]         = useState("");
  const [filters, setFilters]       = useState<PropertyFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [favCount, setFavCount]     = useState(0);
  const propertiesRef = useRef<PropertyListItem[]>([]);
  propertiesRef.current = properties;

  /* ── Favourite count sync ───────────────────────────────── */
  useEffect(() => {
    const update = () => {
      try {
        const ids: string[] = JSON.parse(
          localStorage.getItem("gha_favs") ?? "[]"
        );
        setFavCount(ids.length);
      } catch {
        setFavCount(0);
      }
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  /* ── Transparent status bar (Capacitor only) ────────────── */
  useEffect(() => {
    import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) => {
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  /* ── Request notification permission once ───────────────── */
  useEffect(() => {
    import("@capacitor/local-notifications")
      .then(({ LocalNotifications }) => {
        LocalNotifications.requestPermissions().catch(() => {});
      })
      .catch(() => {});
  }, []);

  /* ── Fetch properties ───────────────────────────────────── */
  const fetchProperties = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.listing) params.set("listing", filters.listing);
      if (filters.region)  params.set("region",  filters.region);
      if (filters.type)    params.set("type",     filters.type);
      if (search)          params.set("q",        search);
      const res  = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      setProperties(data.properties ?? []);
    } catch { /* ignore */ }
  }, [filters, search]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  /* ── Geofence check — called by MapView's onUserLocation ── */
  const checkGeofence = useCallback(
    async (lat: number, lng: number) => {
      if (localStorage.getItem("gha_notif") !== "true") return;
      for (const p of propertiesRef.current) {
        if (notifiedIds.has(p.id)) continue;
        // ← skip properties with no GPS coordinates
        if (p.lat === null || p.lng === null) continue;
        const dist = distanceMetres(lat, lng, p.lat, p.lng);
        if (dist <= NOTIF_RADIUS_M) {
          notifiedIds.add(p.id);
          try {
            const { LocalNotifications } = await import(
              "@capacitor/local-notifications"
            );
            await LocalNotifications.schedule({
              notifications: [
                {
                  id:    Math.floor(Math.random() * 1_000_000),
                  title: "🏠 Property nearby!",
                  body:  `${p.title} — GH₵${p.price.toLocaleString("en-GH")} is ${Math.round(dist)}m away`,
                  schedule: { at: new Date(Date.now() + 500) },
                },
              ],
            });
          } catch { /* ignore — browser doesn't support */ }
        }
      }
    },
    [] // propertiesRef is a ref so no dep needed
  );

  /* ── Receive user location from MapView ─────────────────── */
  const handleUserLocation = useCallback(
    (loc: { lat: number; lng: number } | null) => {
      setUserPos(loc);
      if (loc) checkGeofence(loc.lat, loc.lng);
    },
    [checkGeofence]
  );

  /* ── Client-side text filter ────────────────────────────── */
  const filtered = properties.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.city?.toLowerCase().includes(q) ?? false) ||
      (p.area?.toLowerCase().includes(q) ?? false)
    );
  });

  // Suppress unused warning — userPos used for future features
  void userPos;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--bg-app)" }}
    >
      {/* Content area — leaves room for tab bar */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ paddingBottom: "calc(56px + var(--sab))" }}
      >
        {/* ── MAP TAB ─────────────────────────────────────── */}
        {tab === "map" && (
          <>
            {/* Search bar — respects notch */}
            <div
              className="absolute left-0 right-0 z-30 px-3"
              style={{ top: "calc(var(--sat) + 8px)" }}
            >
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5 shadow-lg"
                style={{
                  background: "var(--surface)",
                  border:     "1px solid var(--border-col)",
                }}
              >
                <Search size={17} style={{ color: "var(--text-muted)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search city, area or title…"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text-main)" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} type="button">
                    <X size={16} style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
                <button
                  onClick={() => setShowFilters((f) => !f)}
                  type="button"
                  className="p-1 rounded-lg transition"
                  style={{
                    background: showFilters ? "#0c3b2e" : "transparent",
                  }}
                >
                  <SlidersHorizontal
                    size={17}
                    style={{
                      color: showFilters ? "#f2b70a" : "var(--text-muted)",
                    }}
                  />
                </button>
              </div>

              {/* Filter pills */}
              {showFilters && (
                <div
                  className="mt-2 rounded-2xl p-3 flex flex-wrap gap-2 shadow-lg"
                  style={{
                    background: "var(--surface)",
                    border:     "1px solid var(--border-col)",
                  }}
                >
                  {(["rent", "sale"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          listing: f.listing === l ? undefined : l,
                        }))
                      }
                      className="px-3 py-1 rounded-full text-xs font-extrabold transition"
                      style={{
                        background:
                          filters.listing === l
                            ? l === "rent"
                              ? "#dc2626"
                              : "#16a34a"
                            : "var(--surface-2)",
                        color:  filters.listing === l ? "#fff" : "var(--text-muted)",
                        border: "1px solid var(--border-col)",
                      }}
                    >
                      {l === "rent" ? "🔴 Rent" : "🟢 Sale"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFilters({})}
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: "var(--surface-2)",
                      border:     "1px solid var(--border-col)",
                      color:      "var(--text-muted)",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Map — no userPos prop, MapView handles location itself */}
            <MapView
              properties={filtered}
              selectedId={selected}
              onSelect={setSelected}
              onUserLocation={handleUserLocation}
            />

            {selected && (
              <PropertySheet
                propertyId={selected}
                onClose={() => setSelected(null)}
              />
            )}
          </>
        )}

        {/* ── FAVOURITES TAB ──────────────────────────────── */}
        {tab === "favourites" && (
          <div
            className="h-full flex flex-col"
            style={{ paddingTop: "calc(var(--sat) + 1rem)" }}
          >
            <FavouritesTab />
          </div>
        )}

        {/* ── PROFILE TAB ─────────────────────────────────── */}
        {tab === "profile" && (
          <div
            className="h-full flex flex-col"
            style={{ paddingTop: "calc(var(--sat) + 1rem)" }}
          >
            <ProfileTab />
          </div>
        )}

        {/* ── SETTINGS TAB ────────────────────────────────── */}
        {tab === "settings" && (
          <div
            className="h-full flex flex-col"
            style={{ paddingTop: "calc(var(--sat) + 1rem)" }}
          >
            <SettingsTab />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <TabBar active={tab} onChange={setTab} favCount={favCount} />
    </div>
  );
}