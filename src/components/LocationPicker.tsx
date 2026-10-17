"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GHANA_CENTER, GHANA_ZOOM } from "@/lib/constants";

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
  height = 260,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [GHANA_CENTER.lat, GHANA_CENTER.lng],
      zoom: GHANA_ZOOM,
      minZoom: 6,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 20 }
    ).addTo(map);

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
    ro.observe(containerRef.current);

    // try to center on the owner's location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 13);
        },
        () => {},
        { timeout: 8000, maximumAge: 60000 }
      );
    }

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // reflect external value changes (e.g. "use my location")
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (markerRef.current) markerRef.current.setLatLng([value.lat, value.lng]);
    else
      markerRef.current = L.marker([value.lat, value.lng], {
        icon: pinIcon(),
      }).addTo(map);
    map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), {
      duration: 0.6,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-brand-200 shadow-inner"
      style={{ height }}
    />
  );
}
