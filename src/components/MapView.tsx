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
  hideControls?:   boolean;   // ← ADD
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
  hideControls,   // ← ADD
}: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const userMarker      = useRef<any>(null);
  const markersRef      = useRef<Record<string, any>>({});
  const watchIdRef      = useRef<string | number | null>(null);
  const LRef            = useRef<any>(null);
  const hasCenteredRef  = useRef(false);   // ← NEW: fly to user only once per session
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null); // ← NEW: retry when GPS off

  /* ── Place / update the blue user dot ── */
  function placeUserDot(L: any, map: any, lat: number, lng: number) {
    onUserLocation?.(lat, lng);

    // ── Auto-center on FIRST successful fix (covers both getCurrentPosition
    //    and watchPosition callbacks, so it works even if getCurrentPosition
    //    timed out because location was initially off) ──────────────────────
    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }

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

  /* ── Request + watch location ── */
  async function startLocation(L: any, map: any) {
    // Clear any existing retry timer
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // Stop existing watch
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

        // Always request — triggers OS permission dialog on first launch
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          console.warn("Location permission denied");
          return;
        }

        // Try to get an immediate fix. If GPS is off this will time out —
        // that's fine, the watchPosition below will fire once GPS turns on.
        try {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
          });
          placeUserDot(L, map, pos.coords.latitude, pos.coords.longitude);
        } catch {
          // GPS was off — watchPosition will deliver the first fix when it comes on
          console.warn("getCurrentPosition timed out — waiting for watchPosition fix");
        }

        // Watch continuously — this fires as soon as GPS becomes available,
        // so turning on location mid-session automatically centres the map
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
      // Web browser path
      if (!("geolocation" in navigator)) return;

      // Get immediate fix
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          placeUserDot(L, map, pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn("getCurrentPosition error:", err.code, err.message);
          // If location services are off (code 2 = POSITION_UNAVAILABLE),
          // schedule a retry in 4 s so it auto-centres when user turns GPS on
          if (err.code === 2) {
            retryTimerRef.current = setTimeout(() => startLocation(L, map), 4000);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Also watch for live updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => placeUserDot(L, map, pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn("watchPosition error:", err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      ) as unknown as string;
    }
  }

  /* ── Init map once ── */
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

      const map = L.map(container, {
  center: [7.9465, -1.0232],
  zoom: 7,
  zoomControl: false,  // ← removes +/- magnification buttons
});
      mapRef.current = map;

      // Zoom control at topright
      L.control.zoom({ position: "topright" }).addTo(map);

      // ── Custom "locate me" button directly on map, below zoom ───────────
      // This lives on the map so users see it next to the zoom buttons.
      const LocateControl = L.Control.extend({
        onAdd() {
          const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
          div.style.cssText = "margin-top:4px;";

          const btn = L.DomUtil.create("a", "", div) as HTMLAnchorElement;
          btn.href  = "#";
          btn.title = "Centre on my location";
          btn.setAttribute("role", "button");
          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
              viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round"
              style="display:block;margin:auto;">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <circle cx="12" cy="12" r="8" stroke-dasharray="none" opacity=".25"/>
            </svg>`;
          btn.style.cssText = `
            display:flex;align-items:center;justify-content:center;
            width:34px;height:34px;cursor:pointer;background:#fff;`;

          L.DomEvent.on(btn, "click", (e: Event) => {
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
            if (userMarker.current) {
              // Already have a fix — just fly to it
              map.flyTo(userMarker.current.getLatLng(), 15, { duration: 1 });
            } else {
              // No fix yet — re-request and centre on first result
              hasCenteredRef.current = false;
              startLocation(L, map);
            }
          });

          return div;
        },
      });
      new LocateControl({ position: "topright" }).addTo(map);
      // ────────────────────────────────────────────────────────────────────

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom:     19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      await startLocation(L, map);
    });

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

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
        mapRef.current    = null;
        userMarker.current = null;
      }

      if (containerRef.current) {
        (containerRef.current as any)._leaflet_id = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── locateSignal from header button (still works too) ── */
  useEffect(() => {
    if (!locateSignal || !mapRef.current) return;
    if (userMarker.current) {
      // Have a fix — just re-centre
      mapRef.current.flyTo(userMarker.current.getLatLng(), 15, { duration: 1 });
    } else if (LRef.current) {
      // No fix — restart location
      hasCenteredRef.current = false;
      startLocation(LRef.current, mapRef.current);
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

/* ── Hide/show map controls when property sheet opens/closes ── */
useEffect(() => {
  if (!mapRef.current) return;
  const el = mapRef.current
    .getContainer()
    .querySelector(".leaflet-control-container") as HTMLElement | null;
  if (el) el.style.display = hideControls ? "none" : "";
}, [hideControls]);

  /* ── Property markers ── */
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};

      properties.forEach((p) => {
        if (p.lat === null || p.lng === null) return;
        if (!isFinite(p.lat!) || !isFinite(p.lng!)) return;

        const color = p.listingType === "rent" ? "#dc2626" : "#16a34a";
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