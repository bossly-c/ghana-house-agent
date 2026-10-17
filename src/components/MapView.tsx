"use client";
import { useEffect, useRef } from "react";
import type { PropertyListItem } from "@/lib/types";

interface FlyTo { lat: number; lng: number; zoom?: number }

interface Props {
  properties:      PropertyListItem[];
  selectedId?:     number | null;
  onSelect:        (id: number) => void;
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
  const markersRef   = useRef<Record<string, any>>({});   // ← string keys
  const watchIdRef   = useRef<string | number | null>(null);
  const LRef         = useRef<any>(null);

  /* ── Blue user dot ── */
  function placeUserDot(L: any, map: any, lat: number, lng: number) {
    onUserLocation?.(lat, lng);

    const icon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:44px;height:44px;">
          <div style="
            position:absolute;top:50%;left:50%;
            width:36px;height:36px;
            background:rgba(59,130,246,0.18);
            border-radius:50%;
            transform:translate(-50%,-50%);
            animation:bpulse 2s ease-in-out infinite;">
          </div>
          <style>
            @keyframes bpulse{
              0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1;}
              50%{transform:translate(-50%,-50%) scale(1.7);opacity:0.15;}
            }
          </style>
          <div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:20px;height:20px;
            background:#3b82f6;
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 0 0 5px rgba(59,130,246,0.22),0 2px 8px rgba(0,0,0,.3);
            z-index:2;">
          </div>
        </div>`,
      iconSize:   [44, 44],
      iconAnchor: [22, 22],
    });

    if (userMarker.current) {
      userMarker.current.setLatLng([lat, lng]);
      userMarker.current.setIcon(icon);
    } else {
      userMarker.current = L.marker([lat, lng], { icon, zIndexOffset: 2000 })
        .addTo(map)
        .bindTooltip("You are here", { permanent: false, direction: "top" });
    }
    map.setView([lat, lng], map.getZoom() < 13 ? 14 : map.getZoom());
  }

  /* ── Start location ── */
  async function startLocation(L: any, map: any) {
    if (isCapacitor()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") return;

        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        placeUserDot(L, map, pos.coords.latitude, pos.coords.longitude);

        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (err || !position) return;
            placeUserDot(L, map, position.coords.latitude, position.coords.longitude);
          }
        );
      } catch (e) {
        console.warn("Capacitor Geolocation error:", e);
      }
    } else {
      if (!("geolocation" in navigator)) return;

      navigator.geolocation.getCurrentPosition(
        (p) => placeUserDot(L, map, p.coords.latitude, p.coords.longitude),
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (p) => placeUserDot(L, map, p.coords.latitude, p.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      ) as unknown as string;
    }
  }

  /* ── Init map (runs once) ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }
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

      const map = L.map(containerRef.current!, {
        center:      [7.9465, -1.0232],
        zoom:        7,
        zoomControl: false,
      });
      mapRef.current = map;

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom:     19,
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

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current     = null;
        userMarker.current = null;
      }

      if (containerRef.current) {
        (containerRef.current as any)._leaflet_id = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Locate button pressed ── */
  useEffect(() => {
    if (!locateSignal || !mapRef.current) return;

    if (userMarker.current) {
      mapRef.current.flyTo(userMarker.current.getLatLng(), 15, { duration: 1 });
      return;
    }

    if (isCapacitor()) {
      import("@capacitor/geolocation").then(async ({ Geolocation }) => {
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
          if (LRef.current && mapRef.current) {
            placeUserDot(LRef.current, mapRef.current, pos.coords.latitude, pos.coords.longitude);
            mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1 });
          }
        } catch {}
      });
    } else {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (LRef.current && mapRef.current) {
            placeUserDot(LRef.current, mapRef.current, p.coords.latitude, p.coords.longitude);
            mapRef.current.flyTo([p.coords.latitude, p.coords.longitude], 15, { duration: 1 });
          }
        },
        () => {}
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateSignal]);

  /* ── Fly to search result ── */
  useEffect(() => {
    if (!flyToSignal || !mapRef.current) return;
    mapRef.current.flyTo(
      [flyToSignal.lat, flyToSignal.lng],
      flyToSignal.zoom ?? 14,
      { duration: 1.2 }
    );
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

        const color = p.listingType === "rent" ? "#ef4444" : "#22c55e";

        // ✅ FIX 1: cast both sides so string id vs number selectedId always compares correctly
        const isSel = String(p.id) === String(selectedId ?? "");

        const units: any[] = (p as any).units ?? [];
        const price = (p as any).isCompound && units.length
          ? `from GH₵ ${Math.min(...units.map((u: any) => Number(u.price))).toLocaleString()}`
          : `GH₵ ${Number(p.price ?? 0).toLocaleString()}`;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${color};
            color:#fff;
            padding:3px 9px;
            border-radius:999px;
            font-size:11px;
            font-weight:700;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            border:${isSel ? "2.5px solid #fff" : "none"};
            transform:${isSel ? "scale(1.18)" : "scale(1)"};
            transition:transform .15s;
          ">${price}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([p.lat!, p.lng!], { icon })
          .addTo(mapRef.current)
          // ✅ FIX 2: p.id is string → cast to number to match onSelect(id: number)
          .on("click", () => onSelect(Number(p.id)));

        // ✅ FIX 3: markersRef is Record<string, any> → use String key
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