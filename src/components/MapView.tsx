"use client";

import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyListItem } from "@/lib/types";
import { LISTING_COLORS, GHANA_CENTER, GHANA_ZOOM } from "@/lib/constants";
import { shortGHS } from "@/lib/format";

export interface MapFocus {
  lat: number;
  lng: number;
  zoom?: number;
  ts: number;
}

interface MapViewProps {
  properties: PropertyListItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  locateSignal?: number;
  onUserLocation?: (loc: { lat: number; lng: number } | null) => void;
}

function createPropertyIcon(
  price: number,
  listing: "rent" | "sale",
  isSelected: boolean,
  showLabel: boolean
): L.DivIcon {
  const colors = LISTING_COLORS[listing];
  const size = isSelected ? 30 : 22;
  const half = size / 2;
  return L.divIcon({
    className: "gha-icon",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${
          isSelected
            ? `<div style="position:absolute;top:50%;left:50%;width:${size + 6}px;height:${size + 6}px;border-radius:50%;background:${colors.ring};animation:gha-pulse-ring 1.6s ease-out infinite;"></div>`
            : ""
        }
        <div style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:${size}px;height:${size}px;border-radius:50%;
          background:${colors.main};
          border:${isSelected ? 3.5 : 2.5}px solid white;
          box-shadow:0 3px 10px rgba(0,0,0,0.35);
          transition:transform 0.25s ease;
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:${isSelected ? 9 : 7}px;height:${isSelected ? 9 : 7}px;border-radius:50%;
          background:white;opacity:0.95;
        "></div>
        ${
          showLabel
            ? `<div style="
                position:absolute;top:${size / 2 + 10}px;left:50%;transform:translateX(-50%);
                background:${isSelected ? colors.main : "rgba(255,255,255,0.96)"};
                color:${isSelected ? "white" : "#1c1917"};
                border:1.5px solid ${isSelected ? colors.main : "rgba(0,0,0,0.08)"};
                padding:2px 7px;border-radius:99px;font-size:10.5px;font-weight:800;
                white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);
                font-family:inherit;
              ">${shortGHS(price)}</div>`
            : ""
        }
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function createUserIcon(heading: number | null): L.DivIcon {
  const hasHeading = heading !== null && !isNaN(heading);
  return L.divIcon({
    className: "gha-user-icon",
    html: `
      <div style="position:relative;width:44px;height:44px;">
        <div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border-radius:50%;background:rgba(37,99,235,0.35);animation:gha-user-pulse 2.4s ease-out infinite;"></div>
        ${
          hasHeading
            ? `<div style="position:absolute;top:50%;left:50%;width:44px;height:44px;transform:translate(-50%,-50%) rotate(${heading}deg);">
                <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:14px solid #2563eb;opacity:0.9;"></div>
              </div>`
            : ""
        }
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#2563eb;border:3.5px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.55);"></div>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function MapView({
  properties,
  selectedId,
  onSelect,
  locateSignal = 0,
  onUserLocation,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerDataRef = useRef<Map<string, PropertyListItem>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const showLabelsRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedIdRef = useRef<string | null>(null);
  const lastFlyKeyRef = useRef<string | null>(null);

  // ---- map init (once) ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [GHANA_CENTER.lat, GHANA_CENTER.lng],
      zoom: GHANA_ZOOM,
      minZoom: 6,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: true,
      zoomSnap: 0.5,
    });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 4,
    }).addTo(map);

    map.zoomControl.setPosition("bottomright");

    map.on("click", () => {
      onSelectRef.current(null);
      lastFlyKeyRef.current = null;
    });

    const updateLabelZoom = () => {
      const show = map.getZoom() >= 10;
      if (show === showLabelsRef.current) return;
      showLabelsRef.current = show;
      markersRef.current.forEach((marker, id) => {
        const p = markerDataRef.current.get(id);
        if (p) {
          marker.setIcon(
            createPropertyIcon(
              p.price,
              p.listingType,
              id === selectedIdRef.current,
              show
            )
          );
        }
      });
    };
    map.on("zoomend", updateLabelZoom);

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      markerDataRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- property markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const active = new Set(properties.map((p) => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!active.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        markerDataRef.current.delete(id);
      }
    });

    properties.forEach((p) => {
      // ← null check first, then isFinite — fixes "null not assignable to number"
      if (p.lat === null || p.lng === null) return;
      if (!isFinite(p.lat) || !isFinite(p.lng)) return;

      markerDataRef.current.set(p.id, p);
      const existing = markersRef.current.get(p.id);
      const isSelected = p.id === selectedIdRef.current;

      if (existing) {
        existing.setLatLng([p.lat, p.lng]);
        existing.setIcon(
          createPropertyIcon(
            p.price,
            p.listingType,
            isSelected,
            showLabelsRef.current
          )
        );
        existing.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([p.lat, p.lng], {
          icon: createPropertyIcon(
            p.price,
            p.listingType,
            isSelected,
            showLabelsRef.current
          ),
          zIndexOffset: isSelected ? 1000 : 0,
        });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e.originalEvent);
          onSelectRef.current(p.id);
        });
        marker.addTo(map);
        markersRef.current.set(p.id, marker);
      }
    });
  }, [properties]);

  // ---- selection styling + fly ----
  const flyToSelected = useCallback((p: PropertyListItem) => {
    const map = mapRef.current;
    if (!map) return;
    // ← null guard before using lat/lng as numbers
    if (p.lat === null || p.lng === null) return;
    const key = p.id;
    if (lastFlyKeyRef.current === key) return;
    lastFlyKeyRef.current = key;
    const targetZoom = Math.max(map.getZoom(), 14);
    map.flyTo([p.lat, p.lng], targetZoom, { duration: 0.8 });
    map.once("moveend", () => {
      const offset = Math.min(220, window.innerHeight * 0.22);
      map.panBy([0, offset], { animate: true });
    });
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    const map = mapRef.current;
    if (!map) return;
    if (!selectedId) {
      lastFlyKeyRef.current = null;
      markersRef.current.forEach((marker, id) => {
        const p = markerDataRef.current.get(id);
        if (p) {
          marker.setIcon(
            createPropertyIcon(
              p.price,
              p.listingType,
              false,
              showLabelsRef.current
            )
          );
          marker.setZIndexOffset(0);
        }
      });
      return;
    }
    const marker = markersRef.current.get(selectedId);
    const p = markerDataRef.current.get(selectedId);
    if (marker && p) {
      marker.setIcon(
        createPropertyIcon(p.price, p.listingType, true, showLabelsRef.current)
      );
      marker.setZIndexOffset(1000);
      flyToSelected(p);
    } else {
      const t = setTimeout(() => {
        const mk = markersRef.current.get(selectedId);
        const pd = markerDataRef.current.get(selectedId);
        if (mk && pd) flyToSelected(pd);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [selectedId, flyToSelected]);

  // ---- user location ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !("geolocation" in navigator)) {
      onUserLocation?.(null);
      return;
    }

    let firstFix = true;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!isFinite(lat) || !isFinite(lng)) return;
        const heading =
          pos.coords.heading !== null && !isNaN(pos.coords.heading)
            ? pos.coords.heading
            : null;
        userLocRef.current = { lat, lng };
        onUserLocation?.({ lat, lng });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
          userMarkerRef.current.setIcon(createUserIcon(heading));
        } else {
          userMarkerRef.current = L.marker([lat, lng], {
            icon: createUserIcon(heading),
            zIndexOffset: 2000,
            interactive: false,
          }).addTo(map);
        }
        const acc = pos.coords.accuracy;
        if (userCircleRef.current) {
          userCircleRef.current.setLatLng([lat, lng]);
          userCircleRef.current.setRadius(Math.min(acc, 500));
        } else {
          userCircleRef.current = L.circle([lat, lng], {
            radius: Math.min(acc, 500),
            color: "rgba(37,99,235,0.35)",
            weight: 1,
            fillColor: "rgba(37,99,235,0.12)",
            fillOpacity: 1,
            interactive: false,
          }).addTo(map);
        }

        if (firstFix && lat > 4.5 && lat < 11.5 && lng > -3.5 && lng < 1.5) {
          map.flyTo([lat, lng], 13, { duration: 1.2 });
          firstFix = false;
        } else {
          firstFix = false;
        }
      },
      () => {
        onUserLocation?.(null);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- locate button signal ----
  useEffect(() => {
    if (locateSignal === 0) return;
    const map = mapRef.current;
    const loc = userLocRef.current;
    if (!map || !loc) return;
    map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 15), {
      duration: 0.9,
    });
  }, [locateSignal]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}