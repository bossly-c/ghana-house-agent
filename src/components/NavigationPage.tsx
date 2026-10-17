"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Search, Navigation, MapPin, Footprints,
  X, Loader2, LocateFixed, Star, Trash2, ChevronUp,
  ChevronDown, CheckCircle2, AlertTriangle, Compass,
} from "lucide-react";

/* ── Ghana centre ── */
const GH_CENTER = { lat: 7.9465, lng: -1.0232 };

interface NavigationPageProps {
  onBack: () => void;
  userLocation: { lat: number; lng: number } | null;
  initialDestination?: { name: string; lat: number; lng: number } | null;
}

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver?: string;
}

interface DirectionInfo {
  distance: number;
  duration: number;
  steps: RouteStep[];
  coordinates: [number, number][];
}

interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  color: string;
  description?: string;
}

const SAVED_KEY = "gha_saved_places";

function loadSaved(): SavedPlace[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
function persistSaved(list: SavedPlace[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

export default function NavigationPage({
  onBack,
  userLocation,
  initialDestination,
}: NavigationPageProps) {
  /* ── Refs ── */
  const mapContainerRef    = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<any>(null);
  const userMarkerRef      = useRef<any>(null);
  const destMarkerRef      = useRef<any>(null);
  const routeLineRef       = useRef<any>(null);
  const passedLineRef      = useRef<any>(null);
  const searchTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef     = useRef<HTMLInputElement>(null);
  const lastFetchedDestRef = useRef("");
  const isRecalcRef        = useRef(false);
  const lastRecalcTimeRef  = useRef(0);
  const userLocationRef    = useRef(userLocation);
  const isNavigatingRef    = useRef(false);
  const autoCenterRef      = useRef(false);
  const remainingRef       = useRef<[number,number][]>([]);
  const passedRef          = useRef<[number,number][]>([]);
  const destRef            = useRef(initialDestination ?? null);

  /* ── State ── */
  const [mapReady,         setMapReady]         = useState(false);
  const [mapLoading,       setMapLoading]        = useState(true);
  const [searchQuery,      setSearchQuery]       = useState("");
  const [searchResults,    setSearchResults]     = useState<SearchResult[]>([]);
  const [isSearching,      setIsSearching]       = useState(false);
  const [showResults,      setShowResults]       = useState(false);
  const [destination,      setDestination]       = useState<{ name:string;lat:number;lng:number }|null>(initialDestination ?? null);
  const [dirInfo,          setDirInfo]           = useState<DirectionInfo|null>(null);
  const [isLoadingRoute,   setIsLoadingRoute]    = useState(false);
  const [showSteps,        setShowSteps]         = useState(false);
  const [isNavigating,     setIsNavigating]      = useState(false);
  const [autoCenter,       setAutoCenter]        = useState(false);
  const [hasArrived,       setHasArrived]        = useState(false);
  const [currentStep,      setCurrentStep]       = useState(0);
  const [remaining,        setRemaining]         = useState<[number,number][]>([]);
  const [passed,           setPassed]            = useState<[number,number][]>([]);
  const [savedPlaces,      setSavedPlaces]       = useState<SavedPlace[]>([]);
  const [showSaved,        setShowSaved]         = useState(false);
  const [addingPlace,      setAddingPlace]       = useState(false);
  const [pendingPos,       setPendingPos]        = useState<{lat:number;lng:number}|null>(null);
  const [placeForm,        setPlaceForm]         = useState({ name:"", description:"", icon:"⭐", color:"#f59e0b" });
  const [confirmDelete,    setConfirmDelete]     = useState<string|null>(null);

  /* ── Sync refs ── */
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);
  useEffect(() => { autoCenterRef.current   = autoCenter;   }, [autoCenter]);
  useEffect(() => { remainingRef.current    = remaining;    }, [remaining]);
  useEffect(() => { passedRef.current       = passed;       }, [passed]);
  useEffect(() => { destRef.current         = destination;  }, [destination]);

  /* ── Load saved places ── */
  useEffect(() => { setSavedPlaces(loadSaved()); }, []);

  /* ── Init map ── */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    setMapLoading(true);

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const centre = userLocation ?? GH_CENTER;
      const map = L.map(mapContainerRef.current!, {
        center:      [centre.lat, centre.lng],
        zoom:        userLocation ? 15 : 7,
        zoomControl: false,
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      map.whenReady(() => { setMapReady(true); setMapLoading(false); });

      map.on("dragstart", () => setAutoCenter(false));

      map.on("click", (e: any) => {
        if (addingPlace) {
          setPendingPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
        setShowResults(false);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Map click re-bind when addingPlace changes ── */
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.off("click");
    mapRef.current.on("click", (e: any) => {
      if (addingPlace) setPendingPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      setShowResults(false);
    });
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = addingPlace ? "crosshair" : "";
    }
  }, [addingPlace]);

  /* ── User location marker ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;
    import("leaflet").then((L) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:44px;height:44px;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;background:rgba(59,130,246,0.2);border-radius:50%;animation:gpulse 2s ease-in-out infinite;"></div>
          <style>@keyframes gpulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1;}50%{transform:translate(-50%,-50%) scale(1.6);opacity:0.3;}}</style>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.3);z-index:2;"></div>
        </div>`,
        iconSize:   [44, 44],
        iconAnchor: [22, 22],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setIcon(icon);
      } else {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon, zIndexOffset: 2000,
        }).addTo(mapRef.current).bindTooltip("You", { permanent: false, direction: "top" });
      }

      if (isNavigatingRef.current && autoCenterRef.current) {
        mapRef.current.panTo([userLocation.lat, userLocation.lng], { animate: true, duration: 0.5 });
      }
    });
  }, [userLocation, mapReady]);

  /* ── Saved place markers ── */
  const savedMarkersRef = useRef<Map<string,any>>(new Map());
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    import("leaflet").then((L) => {
      const ids = new Set(savedPlaces.map(s => s.id));
      savedMarkersRef.current.forEach((m, id) => {
        if (!ids.has(id)) { m.remove(); savedMarkersRef.current.delete(id); }
      });
      savedPlaces.forEach(p => {
        if (savedMarkersRef.current.has(p.id)) return;
        const m = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:26px;height:26px;background:${p.color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,.25);">${p.icon}</div>`,
            iconSize:   [26, 26],
            iconAnchor: [13, 13],
          }),
          zIndexOffset: 500,
        }).addTo(mapRef.current!);
        m.bindPopup(`<div style="font-family:system-ui;min-width:130px;">
          <b style="font-size:13px;">${p.icon} ${p.name}</b>
          ${p.description ? `<p style="font-size:11px;color:#666;margin:4px 0;">${p.description}</p>` : ""}
          <button onclick="window.__ghaNav('${p.lat}','${p.lng}','${encodeURIComponent(p.name)}')"
            style="width:100%;padding:8px;background:#059669;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;margin-top:6px;">
            Navigate Here
          </button>
        </div>`);
        savedMarkersRef.current.set(p.id, m);
      });
    });
  }, [savedPlaces, mapReady]);

  /* ── Global navigate helper for popup buttons ── */
  useEffect(() => {
    (window as any).__ghaNav = (lat: string, lng: string, name: string) => {
      setDestination({ lat: parseFloat(lat), lng: parseFloat(lng), name: decodeURIComponent(name) });
      mapRef.current?.closePopup();
    };
    return () => { delete (window as any).__ghaNav; };
  }, []);

  /* ── Nominatim search ── */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    const lq = q.toLowerCase();
    const results: SearchResult[] = [];

    savedPlaces.forEach(p => {
      if (p.name.toLowerCase().includes(lq))
        results.push({ name: `${p.icon} ${p.name}`, lat: p.lat, lng: p.lng });
    });

    if (results.length < 8 && q.length >= 3) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + " Ghana")}&limit=8&countrycodes=gh`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        data.forEach((item: any) => {
          results.push({
            name: item.display_name.split(",").slice(0, 3).join(", "),
            lat:  parseFloat(item.lat),
            lng:  parseFloat(item.lon),
          });
        });
      } catch {}
    }

    setSearchResults(results.slice(0, 10));
    setShowResults(true);
    setIsSearching(false);
  }, [savedPlaces]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(searchQuery), 350);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, doSearch]);

  /* ── Fetch route when destination changes ── */
  useEffect(() => {
    if (!destination || !mapReady || !mapRef.current) return;
    const key = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
    if (lastFetchedDestRef.current === key) return;
    lastFetchedDestRef.current = key;

    const origin = userLocationRef.current ?? GH_CENTER;

    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      setHasArrived(false);
      setCurrentStep(0);
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.code !== "Ok" || !data.routes?.length) throw new Error("no route");

        const route = data.routes[0];
        const coords: [number,number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number,number]) => [lat, lng]
        );
        const steps: RouteStep[] = route.legs[0].steps.map((s: any) => ({
          instruction: s.name || s.maneuver?.type || "Continue",
          distance:    s.distance,
          duration:    s.duration,
          maneuver:    s.maneuver?.type,
        }));

        setDirInfo({ distance: route.distance, duration: route.duration, steps, coordinates: coords });
        setRemaining(coords);
        setPassed([]);

        import("leaflet").then((L) => {
          routeLineRef.current?.remove();
          passedLineRef.current?.remove();
          passedLineRef.current = null;

          routeLineRef.current = L.polyline(coords, {
            color: "#3b82f6", weight: 6, opacity: 0.9,
            lineJoin: "round", lineCap: "round",
          }).addTo(mapRef.current!);

          destMarkerRef.current?.remove();
          destMarkerRef.current = L.marker([destination.lat, destination.lng], {
            icon: L.divIcon({
              className: "",
              html: `<div style="position:relative;width:36px;height:44px;">
                <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
                  width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:18px solid #ef4444;"></div>
                <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);
                  width:28px;height:28px;background:#ef4444;border:3px solid white;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                </div>
              </div>`,
              iconSize:   [36, 44],
              iconAnchor: [18, 44],
            }),
            zIndexOffset: 1500,
          }).addTo(mapRef.current!).bindPopup(`<b>${destination.name}</b>`);

          const bounds = L.latLngBounds(coords);
          mapRef.current!.fitBounds(bounds, { padding: [60, 60] });
        });
      } catch {
        setDirInfo(null);
      } finally {
        setIsLoadingRoute(false);
      }
    };
    fetchRoute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, mapReady]);

  /* ── Recalculate if off-route ── */
  const recalcRoute = useCallback(async () => {
    const dest = destRef.current;
    const loc  = userLocationRef.current;
    if (!dest || !loc || !mapRef.current || isRecalcRef.current) return;
    const now = Date.now();
    if (now - lastRecalcTimeRef.current < 15000) return;
    lastRecalcTimeRef.current = now;
    isRecalcRef.current = true;
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${loc.lng},${loc.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.length) return;

      const route = data.routes[0];
      const coords: [number,number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number,number]) => [lat, lng]
      );
      const steps: RouteStep[] = route.legs[0].steps.map((s: any) => ({
        instruction: s.name || s.maneuver?.type || "Continue",
        distance:    s.distance,
        duration:    s.duration,
        maneuver:    s.maneuver?.type,
      }));
      setDirInfo({ distance: route.distance, duration: route.duration, steps, coordinates: coords });
      setRemaining(coords);
      setPassed([]);
      setCurrentStep(0);
      routeLineRef.current?.setLatLngs(coords);
      passedLineRef.current?.remove();
      passedLineRef.current = null;
      lastFetchedDestRef.current = `${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`;
    } catch {}
    finally { isRecalcRef.current = false; }
  }, []);

  /* ── Navigation progress ── */
  useEffect(() => {
    if (!isNavigating || !userLocation) return;
    const rem  = remainingRef.current;
    const pas  = passedRef.current;
    const dest = destRef.current;
    if (rem.length < 2) return;

    const uPos: [number,number] = [userLocation.lat, userLocation.lng];
    let closestIdx = 0, closestDist = Infinity;
    for (let i = 0; i < rem.length; i++) {
      const d = Math.hypot(rem[i][0] - uPos[0], rem[i][1] - uPos[1]);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }

    if (closestDist > 0.0006) { recalcRoute(); return; }

    if (closestIdx > 0) {
      const newPassed = [...pas, ...rem.slice(0, closestIdx)];
      const newRem    = rem.slice(closestIdx);
      setPassed(newPassed);
      setRemaining(newRem);

      setDirInfo(prev => {
        if (!prev) return prev;
        const ratio = newPassed.length / (newPassed.length + newRem.length);
        setCurrentStep(Math.min(Math.floor(ratio * prev.steps.length), prev.steps.length - 1));
        return prev;
      });

      import("leaflet").then((L) => {
        if (!mapRef.current) return;
        if (passedLineRef.current) {
          passedLineRef.current.setLatLngs(newPassed);
        } else if (newPassed.length > 1) {
          passedLineRef.current = L.polyline(newPassed, {
            color: "#9ca3af", weight: 6, opacity: 0.5, dashArray: "10,10",
          }).addTo(mapRef.current!);
        }
        routeLineRef.current?.setLatLngs(newRem);
      });
    }

    if (dest) {
      const d = Math.hypot(dest.lat - uPos[0], dest.lng - uPos[1]);
      if (d < 0.0003) {
        setIsNavigating(false);
        setHasArrived(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, isNavigating, recalcRoute]);

  /* ── Helpers ── */
  const clearDestination = useCallback(() => {
    setDestination(null);
    setDirInfo(null);
    setIsNavigating(false);
    setAutoCenter(false);
    setRemaining([]);
    setPassed([]);
    setHasArrived(false);
    setCurrentStep(0);
    lastFetchedDestRef.current = "";
    routeLineRef.current?.remove(); routeLineRef.current = null;
    passedLineRef.current?.remove(); passedLineRef.current = null;
    destMarkerRef.current?.remove(); destMarkerRef.current = null;
  }, []);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
    setAutoCenter(true);
    setShowSteps(false);
    if (mapRef.current && userLocationRef.current) {
      const { lat, lng } = userLocationRef.current;
      mapRef.current.flyTo([lat, lng], 18, { duration: 0.8 });
    }
  }, []);

  const centerOnUser = useCallback(() => {
    if (mapRef.current && userLocationRef.current) {
      const { lat, lng } = userLocationRef.current;
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 17), { duration: 0.6 });
      setAutoCenter(true);
    }
  }, []);

  const getRemainingInfo = () => {
    if (!dirInfo || !isNavigating) return null;
    const total = passed.length + remaining.length;
    if (!total) return null;
    const ratio = passed.length / total;
    return {
      distance: dirInfo.distance * (1 - ratio),
      duration: dirInfo.duration * (1 - ratio),
    };
  };

  const savePlaceFromForm = () => {
    if (!pendingPos || !placeForm.name.trim()) return;
    const np: SavedPlace = {
      id:          Date.now().toString(),
      name:        placeForm.name.trim(),
      description: placeForm.description.trim() || undefined,
      icon:        placeForm.icon,
      color:       placeForm.color,
      lat:         pendingPos.lat,
      lng:         pendingPos.lng,
    };
    const updated = [...savedPlaces, np];
    setSavedPlaces(updated);
    persistSaved(updated);
    setPendingPos(null);
    setPlaceForm({ name: "", description: "", icon: "⭐", color: "#f59e0b" });
    setAddingPlace(false);
  };

  const deletePlace = (id: string) => {
    const updated = savedPlaces.filter(p => p.id !== id);
    setSavedPlaces(updated);
    persistSaved(updated);
    savedMarkersRef.current.get(id)?.remove();
    savedMarkersRef.current.delete(id);
    setConfirmDelete(null);
  };

  const fmt = {
    dist: (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`,
    dur:  (s: number) => {
      if (s < 60) return `${Math.round(s)}s`;
      const m = Math.round(s / 60);
      if (m < 60) return `${m} min`;
      return `${Math.floor(m/60)}h ${m%60}m`;
    },
    stepIcon: (maneuver?: string) => {
      switch (maneuver) {
        case "turn": return "↱";
        case "continue": return "↑";
        case "arrive": return "🏁";
        case "depart": return "▶";
        default: return "→";
      }
    },
  };

  const ICONS   = ["⭐","🏠","📍","❤️","🎯","🏢","🍽️","☕","🏥","🏪","⛽","🅿️","🚏","🏖️","🏫"];
  const COLORS  = ["#f59e0b","#ef4444","#3b82f6","#10b981","#8b5cf6","#ec4899","#06b6d4","#84cc16"];
  const remInfo = getRemainingInfo();
  const panelH  = dirInfo ? 180 : 16;

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-[2000] bg-zinc-100 dark:bg-zinc-950 flex flex-col">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* ── Header ── */}
      <header
        className="flex-none bg-emerald-700 text-white flex items-center gap-2 px-3 py-2.5 z-[600]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-base leading-tight">Navigation</h1>
          {isNavigating && remInfo ? (
            <p className="text-xs text-emerald-200 truncate">
              {fmt.dist(remInfo.distance)} · {fmt.dur(remInfo.duration)} remaining
            </p>
          ) : destination ? (
            <p className="text-xs text-emerald-200 truncate">To: {destination.name}</p>
          ) : (
            <p className="text-xs text-emerald-200">Search for a destination</p>
          )}
        </div>
        {isNavigating && (
          <button
            onClick={centerOnUser}
            className={`p-2.5 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
              autoCenter ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            <Compass size={20} />
          </button>
        )}
        {destination && !isNavigating && (
          <button onClick={clearDestination} className="p-2.5 rounded-full hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        )}
      </header>

      {/* ── Search bar ── */}
      {!isNavigating && (
        <div className="absolute left-3 right-3 z-[500]" style={{ top: "calc(60px + env(safe-area-inset-top))" }}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery) setShowResults(true); }}
              placeholder="Search any location in Ghana…"
              className="w-full pl-10 pr-9 py-3.5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              enterKeyHint="search"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full">
                <X size={15} className="text-zinc-400" />
              </button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
            )}
          </div>

          {/* Results */}
          {showResults && searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { setDestination({ name: r.name, lat: r.lat, lng: r.lng }); setSearchQuery(""); setShowResults(false); }}
                  className="w-full px-4 py-3.5 text-left flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-700 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                  <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{r.name}</p>
                  </div>
                  <Navigation size={14} className="text-zinc-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
          {showResults && searchResults.length === 0 && searchQuery.length > 1 && !isSearching && (
            <div className="mt-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-5 text-center">
              <AlertTriangle size={28} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No results for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step banner during navigation ── */}
      {isNavigating && dirInfo && dirInfo.steps[currentStep] && (
        <div className="absolute left-3 right-3 z-[500]" style={{ top: "calc(60px + env(safe-area-inset-top))" }}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-lg font-bold text-emerald-700 flex-shrink-0">
              {fmt.stepIcon(dirInfo.steps[currentStep].maneuver)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {dirInfo.steps[currentStep].instruction || "Continue"}
              </p>
              <p className="text-xs text-zinc-500">{fmt.dist(dirInfo.steps[currentStep].distance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Map ── */}
      <div ref={mapContainerRef} className="flex-1 relative" />

      {mapLoading && (
        <div className="absolute inset-0 z-[450] bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-medium">Loading map…</p>
          </div>
        </div>
      )}

      {/* ── Float buttons ── */}
      <div
        className="absolute right-3 z-[500] flex flex-col gap-3"
        style={{ bottom: `calc(${panelH}px + env(safe-area-inset-bottom))`, transition: "bottom .3s ease" }}
      >
        {/* Save a place */}
        {!isNavigating && (
          <button onClick={() => { setAddingPlace(!addingPlace); setPendingPos(null); }}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 ${
              addingPlace ? "bg-red-500 text-white" : "bg-white dark:bg-zinc-800 text-amber-500 border-2 border-zinc-200 dark:border-zinc-700"
            }`}>
            {addingPlace ? <X size={20} /> : <Star size={20} className="fill-current" />}
          </button>
        )}
        {/* Centre */}
        <button onClick={centerOnUser}
          className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-lg border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center transition-all hover:bg-zinc-50 active:scale-90">
          <LocateFixed size={20} className="text-blue-500" />
        </button>
        {/* Saved places toggle */}
        {!destination && !isNavigating && savedPlaces.length > 0 && (
          <button onClick={() => setShowSaved(!showSaved)}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 border-2 ${
              showSaved ? "bg-amber-500 text-white border-amber-400" : "bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
            }`}>
            <MapPin size={20} />
          </button>
        )}
        {/* Re-centre pulse */}
        {isNavigating && !autoCenter && (
          <button onClick={centerOnUser}
            className="w-12 h-12 bg-emerald-700 rounded-full shadow-xl flex items-center justify-center border-2 border-emerald-400 animate-pulse active:scale-90">
            <Compass size={20} className="text-white" />
          </button>
        )}
      </div>

      {/* ── Adding hint ── */}
      {addingPlace && !pendingPos && (
        <div className="absolute top-[120px] left-3 right-3 z-[500]">
          <div className="bg-amber-500 text-white px-4 py-3.5 rounded-2xl shadow-lg flex items-center gap-3">
            <Star size={20} className="flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Tap the map to pin a place</p>
              <p className="text-xs text-amber-100">Choose any spot to bookmark</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved places panel ── */}
      {showSaved && !destination && !isNavigating && savedPlaces.length > 0 && (
        <div className="absolute left-3 right-16 z-[500]" style={{ bottom: `calc(${panelH + 12}px + env(safe-area-inset-bottom))` }}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Star size={13} className="text-amber-500" /> Saved Places
              </p>
              <button onClick={() => setShowSaved(false)} className="p-1"><X size={15} className="text-zinc-400" /></button>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {savedPlaces.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700">
                  <button onClick={() => { setDestination({ name: p.name, lat: p.lat, lng: p.lng }); setShowSaved(false); }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: p.color + "22" }}>
                      {p.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{p.name}</p>
                      {p.description && <p className="text-xs text-zinc-400 truncate">{p.description}</p>}
                    </div>
                  </button>
                  <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Save place form modal ── */}
      {pendingPos && (
        <div className="fixed inset-0 z-[700] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPendingPos(null)} />
          <div className="relative bg-white dark:bg-zinc-800 rounded-t-3xl shadow-2xl w-full max-w-md p-5 flex flex-col"
            style={{ maxHeight: "85dvh", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white">⭐ Save This Place</h3>
            <div className="overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-1.5 block">Name</label>
                <input type="text" value={placeForm.name} onChange={e => setPlaceForm({ ...placeForm, name: e.target.value })}
                  placeholder="e.g. My Apartment" autoFocus
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm bg-white dark:bg-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-1.5 block">Description (optional)</label>
                <input type="text" value={placeForm.description} onChange={e => setPlaceForm({ ...placeForm, description: e.target.value })}
                  placeholder="e.g. 3-bedroom apartment"
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm bg-white dark:bg-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-1.5 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setPlaceForm({ ...placeForm, icon: ic })}
                      className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                        placeForm.icon === ic ? "bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-500 scale-110" : "bg-zinc-100 dark:bg-zinc-700"
                      }`}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-1.5 block">Colour</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setPlaceForm({ ...placeForm, color: c })}
                      className={`w-11 h-11 rounded-xl transition-all ${placeForm.color === c ? "ring-2 ring-offset-2 ring-zinc-400 scale-110" : ""}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPendingPos(null)}
                className="flex-1 py-3.5 border border-zinc-300 dark:border-zinc-600 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300">
                Cancel
              </button>
              <button onClick={savePlaceFromForm} disabled={!placeForm.name.trim()}
                className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-semibold disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-2">Delete saved place?</h3>
            <p className="text-sm text-zinc-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300">
                Cancel
              </button>
              <button onClick={() => deletePlace(confirmDelete)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Arrived overlay ── */}
      {hasArrived && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHasArrived(false)} />
          <div className="relative bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">You&apos;ve Arrived! 🎉</h2>
            <p className="text-sm text-zinc-500 mb-6">{destination?.name}</p>
            <div className="flex gap-3">
              <button onClick={() => { setHasArrived(false); clearDestination(); }}
                className="flex-1 py-3.5 bg-emerald-700 text-white rounded-xl font-semibold active:scale-95">
                Done
              </button>
              {destination && (
                <button onClick={() => { setHasArrived(false); if (destination) { setPendingPos({ lat: destination.lat, lng: destination.lng }); setPlaceForm({ ...placeForm, name: destination.name }); } }}
                  className="py-3.5 px-4 border-2 border-amber-500 text-amber-600 rounded-xl font-semibold active:scale-95 flex items-center gap-2">
                  <Star size={16} /> Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Directions panel ── */}
      {dirInfo && !hasArrived && (
        <div
          className="absolute left-0 right-0 bottom-0 z-[500] bg-white dark:bg-zinc-800 rounded-t-3xl shadow-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Drag handle */}
          <button className="w-full py-3 flex items-center justify-center active:bg-zinc-50 dark:active:bg-zinc-700 rounded-t-3xl"
            onClick={() => setShowSteps(!showSteps)}>
            <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
          </button>

          {/* Summary row */}
          <div className="px-4 pb-3 border-b border-zinc-100 dark:border-zinc-700">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                    {remInfo ? fmt.dur(remInfo.duration) : fmt.dur(dirInfo.duration)}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Walking</p>
                </div>
                <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                <div className="text-center">
                  <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">
                    {remInfo ? fmt.dist(remInfo.distance) : fmt.dist(dirInfo.distance)}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Distance</p>
                </div>
                <button onClick={() => setShowSteps(!showSteps)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg ml-2">
                  {showSteps ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronUp size={16} className="text-zinc-400" />}
                </button>
              </div>

              {!isNavigating ? (
                <button onClick={startNavigation}
                  className="px-5 py-3 bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-800 transition-colors active:scale-95 min-h-[44px]">
                  <Navigation size={16} />
                  <span className="text-sm">Start</span>
                </button>
              ) : (
                <button onClick={() => { setIsNavigating(false); setAutoCenter(false); }}
                  className="px-5 py-3 bg-red-500 text-white rounded-xl font-semibold active:scale-95 text-sm min-h-[44px]">
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Steps */}
          {showSteps && (
            <div className="px-4 py-3 overflow-y-auto overscroll-contain max-h-[35vh]">
              <div className="flex items-center gap-2 mb-3">
                <Footprints size={15} className="text-zinc-400" />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Step-by-step</p>
              </div>
              <div className="space-y-1">
                {dirInfo.steps.map((step, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                    i === currentStep && isNavigating ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" :
                    i < currentStep && isNavigating ? "opacity-40" : ""
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      i === currentStep && isNavigating ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
                    }`}>
                      {fmt.stepIcon(step.maneuver)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-900 dark:text-white leading-snug">{step.instruction || "Continue"}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{fmt.dist(step.distance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Route loading ── */}
      {isLoadingRoute && (
        <div className="absolute inset-0 z-[550] bg-black/20 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-800 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-emerald-700" />
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Calculating route…</p>
          </div>
        </div>
      )}
    </div>
  );
}