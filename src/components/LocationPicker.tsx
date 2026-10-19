"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GHANA_CENTER, GHANA_ZOOM } from "@/lib/constants";
import { Search, MapPin } from "lucide-react";

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  height?: number;
}

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "gha-icon",
    html: `<div style="position:relative;width:34px;height:44px;">
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 11.5 15 25.4 15.6 26 .5.6 1.3.6 1.8 0C18 42.4 34 28.5 34 17 34 7.6 26.4 0 17 0z" fill="#0c3b2e"/>
        <circle cx="17" cy="16" r="8" fill="white"/>
        <path d="M12 16l3.2 3.2L22 12.4" stroke="#f2b70a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
  });
}

export default function LocationPicker({
  value,
  onChange,
  height = 280,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  /* ── Nominatim search state ── */
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<any[]>([]);
  const [searching,   setSearching]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Init map ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:           [GHANA_CENTER.lat, GHANA_CENTER.lng],
      zoom:             GHANA_ZOOM,
      minZoom:          6,
      maxZoom:          19,
      zoomControl:      true,
      attributionControl: false,
    });
    mapRef.current = map;

    // ✅ OSM tiles — no API key required
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const setMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon() }).addTo(map);
      }
    };

    map.on("click", (e: L.LeafletMouseEvent) => {
      setMarker(e.latlng.lat, e.latlng.lng);
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(containerRef.current!);

    // Try to center on user location (best effort — may be blocked)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        },
        () => {},
        { timeout: 6000, maximumAge: 60_000 }
      );
    }

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
  }, []);

  /* ── Reflect external value changes (e.g. "use my location" button) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    } else {
      markerRef.current = L.marker([value.lat, value.lng], { icon: pinIcon() }).addTo(map);
    }
    map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  /* ── Nominatim search ── */
  function handleSearch(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + " Ghana")}&limit=5&countrycodes=gh`,
          { headers: { "Accept-Language": "en" } }
        );
        setResults(await r.json());
      } catch {
        /* ignore network errors */
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function pickResult(r: any) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setResults([]);
    setQuery(r.display_name.split(",")[0]);

    const map = mapRef.current;
    if (!map) return;
    map.flyTo([lat, lng], 15, { duration: 0.6 });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon() }).addTo(map);
    }
    onChangeRef.current({ lat, lng });
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        <input
          className="input pl-9 pr-9"
          placeholder="Search area, street, landmark in Ghana…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        )}

        {/* Dropdown results */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border-col)] rounded-2xl shadow-xl z-[9999] overflow-hidden">
            {results.map((r: any) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => pickResult(r)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--surface-2)] border-b border-[var(--border-col)] last:border-0 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
                <span className="line-clamp-2 text-[var(--text-main)]">
                  {r.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full overflow-hidden rounded-2xl border border-[var(--border-col)] shadow-inner"
          style={{ height }}
        />
        {/* Tap hint when no pin yet */}
        {!value && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-black/65 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
            Tap the map to drop a pin
          </div>
        )}
        {/* Coordinates badge when pin is placed */}
        {value && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-black/65 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none font-mono whitespace-nowrap">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}