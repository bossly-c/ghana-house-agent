"use client";
import { useEffect, useRef } from "react";
import type { PropertyListItem } from "@/lib/types";

interface FlyTo { lat: number; lng: number; zoom?: number }

interface Props {
  properties:      PropertyListItem[];
  selectedId?:     string | null;
  onSelect:        (id: string) => void;
  onUserLocation?: (lat: number, lng: number) => void;
  locateSignal?:   number;
  flyToSignal?:    FlyTo | null;
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor;
}

export default function MapView({
  properties,
  selectedId,
  onSelect,
  onUserLocation,
  locateSignal,
  flyToSignal,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const userMarker   = useRef<any>(null);
  const markersRef   = useRef<Record<string, any>>({});
  const watchIdRef   = useRef<string | number | null>(null);
  const LRef         = useRef<any>(null);

  function placeUserDot(L: any, map: any, lat: number, lng: number) {
    onUserLocation?.(lat, lng);

    const icon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:32px;height:32px;">
          <div style="
            position:absolute;top:50%;left:50%;
            width:28px;height:28px;
            background:rgba(59,130,246,0.15);
            border-radius:50%;
            transform:translate(-50%,-50%);
            animation:bpulse 2s ease-in-out infinite;">
          </div>
          <style>
            @keyframes bpulse{
              0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1;}
              50%{transform:translate(-50%,-50%) scale(1.8);opacity:0.1;}
            }
          </style>
          <div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:13px;height:13px;
            background:#3b82f6;
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 0 0 3px rgba(59,130,246,0.25),0 2px 6px rgba(0,0,0,.35);
            z-index:2;">
          </div>
        </div>`,
      iconSize:   [32, 32],
      iconAnchor: [16, 16],
    });

    if (userMarker.current) {
      userMarker.current.setLatLng([lat, lng]);
      userMarker.current.setIcon(icon);
    } else {
      userMarker.current = L.marker([lat, lng], { icon, zIndexOffset: 500 })
        .addTo(map)
        .bindTooltip("You are here", { permanent: false, direction: "top" });
    }
  }

  async function startLocation(L: any, map: any) {
    if (watchIdRef.current !== null) {
      if (isCapacitor()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        Geolocation.clearWatch({ id: watchIdRef.current as string });
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current as number);
      }
      watchIdRef.current = null;
    }

    if (isCapacitor()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") { console.warn("Location permission denied"); return; }
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          placeUserDot(L, map, pos.coords.latitude, pos.coords.longitude);
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 1.2 });
        } catch (e) { console.warn("getCurrentPosition failed:", e); }
        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (err || !position) return;
            placeUserDot(L, map, position.coords.latitude, position.coords.longitude);
          }
        );
      } catch (e) { console.warn("Capacitor Geolocation error:", e); }
    } else {
      if (!("geolocation" in navigator)) return;
      const options = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 };
      navigator.geolocation.getCurrentPosition(
        (p) => {
          placeUserDot(L, map, p.coords.latitude, p.coords.longitude);
          map.flyTo([p.coords.latitude, p.coords.longitude], 14, { duration: 1.2 });
        },
        (err) => console.warn("getCurrentPosition error:", err),
        options
      );
      watchIdRef.current = navigator.geolocation.watchPosition(
        (p) => placeUserDot(L, map, p.coords.latitude, p.coords.longitude),
        (err) => console.warn("watchPosition error:", err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      ) as unknown as string;
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    if ((container as any)._leaflet_id) { (container as any)._leaflet_id = null; }
    if (mapRef.current) return;

    import("leaflet").then(async (L) => {
      if (mapRef.current || !containerRef.current) return;
      LRef.current = L;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(containerRef.current!, { center: [7.9465, -1.0232], zoom: 7, zoomControl: false });
      mapRef.current = map;
      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      await startLocation(L, map);
    });

    return () => {
      if (watchIdRef.current !== null) {
        if (isCapacitor()) {
          import("@capacitor/geolocation").then(({ Geolocation }) => {
            Geolocation.clearWatch({ id: watchIdRef.current as string });
          });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
        watchIdRef.current = null;
      }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; userMarker.current = null; }
      if (containerRef.current) { (containerRef.current as any)._leaflet_id = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!locateSignal || !mapRef.current || !LRef.current) return;
    startLocation(LRef.current, mapRef.current).then(() => {
      if (userMarker.current && mapRef.current) {
        mapRef.current.flyTo(userMarker.current.getLatLng(), 15, { duration: 1 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateSignal]);

  useEffect(() => {
    if (!flyToSignal || !mapRef.current) return;
    mapRef.current.flyTo([flyToSignal.lat, flyToSignal.lng], flyToSignal.zoom ?? 14, { duration: 1.2 });
  }, [flyToSignal]);

  /* ── Property markers ── */
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};

      properties.forEach((p) => {
        if (p.lat === null || p.lng === null) return;
        if (!isFinite(p.lat!) || !isFinite(p.lng!)) return;

        const color  = p.listingType === "rent" ? "#dc2626" : "#16a34a"; // ← darker red/green for better contrast
        const isSel  = String(p.id) === String(selectedId ?? "");
        const units: any[] = (p as any).units ?? [];

        const price = (p as any).isCompound && units.length
          ? `from GH₵ ${Math.min(...units.map((u: any) => Number(u.price))).toLocaleString()}`
          : `GH₵ ${Number(p.price ?? 0).toLocaleString()}`;

        const icon = L.divIcon({
          className: "",
          // ─────────────────────────────────────────────────────────────────
          // FIX: border changed from white → dark translucent so the pill
          //      stands out against the cream OSM map background.
          //      text-shadow added so white price text is always crisp.
          //      Box-shadow made stronger for better map separation.
          // ─────────────────────────────────────────────────────────────────
          html: `<div style="
            background:${color};
            color:#fff;
            text-shadow:0 1px 3px rgba(0,0,0,0.55);
            padding:4px 9px;
            border-radius:999px;
            font-size:11px;
            font-weight:700;
            white-space:nowrap;
            letter-spacing:-0.01em;
            border:2px solid rgba(0,0,0,0.18);
            box-shadow:${isSel
              ? `0 0 0 2.5px #fff,0 0 0 4.5px ${color},0 4px 14px rgba(0,0,0,0.5)`
              : "0 2px 8px rgba(0,0,0,0.42),0 1px 3px rgba(0,0,0,0.28)"};
            transform:${isSel ? "scale(1.18)" : "scale(1)"};
            transition:transform .15s;
          ">${price}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([p.lat!, p.lng!], { icon, zIndexOffset: 1000 })
          .addTo(mapRef.current)
          .on("click", () => onSelect(String(p.id)));

        markersRef.current[String(p.id)] = marker;
      });
    });
  }, [properties, selectedId, onSelect]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}