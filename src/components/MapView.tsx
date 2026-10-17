"use client";
import { useEffect, useRef } from "react";
import type { PropertyListItem } from "@/lib/types";

interface Props {
  properties: PropertyListItem[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  onUserLocation?: (lat: number, lng: number) => void;
  locateSignal?: number;
}

export default function MapView({
  properties,
  selectedId,
  onSelect,
  onUserLocation,
  locateSignal,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const userMarker   = useRef<any>(null);
  const markersRef   = useRef<Record<number, any>>({});
  const watchRef     = useRef<number | null>(null);

  /* ── Init map ── */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    import("leaflet").then((L) => {
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

      // Zoom control top-right — never hidden behind tab bar or sheets
      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom:     19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;

      // Trigger permission dialog immediately and start watching
      startWatching(L, map);
    });

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startWatching(L: any, map: any) {
    if (!("geolocation" in navigator)) return;

    // One-shot first — triggers OS permission dialog
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePos(L, map, pos),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Continuous watch
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => handlePos(L, map, pos),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  function handlePos(L: any, map: any, pos: GeolocationPosition) {
    const { latitude: lat, longitude: lng } = pos.coords;
    onUserLocation?.(lat, lng);

    const icon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:44px;height:44px;">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:32px;height:32px;background:rgba(59,130,246,0.18);border-radius:50%;
          animation:bpulse 2s ease-in-out infinite;"></div>
        <style>@keyframes bpulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1;}50%{transform:translate(-50%,-50%) scale(1.6);opacity:0.25;}}</style>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;
          box-shadow:0 0 0 6px rgba(59,130,246,0.2),0 2px 8px rgba(0,0,0,.3);z-index:2;"></div>
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
  }

  /* ── Fly to user on locateSignal ── */
  useEffect(() => {
    if (!locateSignal || !mapRef.current) return;
    if (userMarker.current) {
      mapRef.current.flyTo(userMarker.current.getLatLng(), 15, { duration: 1 });
    } else {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapRef.current?.flyTo(
          [pos.coords.latitude, pos.coords.longitude], 15, { duration: 1 }
        );
      }, () => {});
    }
  }, [locateSignal]);

  /* ── Property markers ── */
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};

      properties.forEach((p) => {
        if (p.lat === null || p.lng === null) return;
        if (!isFinite(p.lat!) || !isFinite(p.lng!)) return;

        const color    = p.listingType === "rent" ? "#ef4444" : "#22c55e";
        const selected = p.id === selectedId;

        const units: any[] = (p as any).units ?? [];
        const price = (p as any).isCompound && units.length
          ? `from GH₵ ${Math.min(...units.map((u: any) => Number(u.price))).toLocaleString()}`
          : `GH₵ ${Number(p.price ?? 0).toLocaleString()}`;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${color};color:#fff;
            padding:3px 8px;border-radius:999px;
            font-size:11px;font-weight:700;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            border:${selected ? "2px solid #fff" : "none"};
            transform:${selected ? "scale(1.15)" : "scale(1)"};
            transition:transform .15s;
          ">${price}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([p.lat!, p.lng!], { icon })
          .addTo(mapRef.current)
          .on("click", () => onSelect(p.id));

        markersRef.current[p.id] = marker;
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