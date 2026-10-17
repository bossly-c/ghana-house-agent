// src/components/TourViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { TourSceneDto } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";

interface TourViewerProps {
  scenes: TourSceneDto[];
  title: string;
}

export default function TourViewer({ scenes, title }: TourViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<{ destroy: () => void } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // ← use roomName (correct TourSceneDto field), not name
  const [currentName, setCurrentName] = useState(scenes[0]?.roomName ?? "");

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!cancelled && status === "loading") {
        setStatus("error");
      }
    }, 15000);

    if (!containerRef.current || scenes.length === 0) {
      clearTimeout(timeout);
      return;
    }

    (async () => {
      try {
        const [{ Viewer }, { VirtualTourPlugin }] = await Promise.all([
          import("@photo-sphere-viewer/core"),
          import("@photo-sphere-viewer/virtual-tour-plugin"),
        ]);
        if (cancelled || !containerRef.current) return;

        // ← use position for ordering, roomName for labels
        // Auto-link each scene to the next in position order
        const sorted = [...scenes].sort((a, b) => a.position - b.position);

        const nodes = sorted.map((s, i) => ({
          id: s.id,
          panorama: s.panoUrl,
          name: s.roomName,               // ← roomName not name
          caption: `${title} — ${s.roomName}`,
          thumbnail: s.panoUrl,
          // Auto-link to next scene (forward) and previous scene (back)
          links: [
            ...(i < sorted.length - 1
              ? [
                  {
                    nodeId: sorted[i + 1].id,
                    position: { yaw: "0deg", pitch: "0deg" },
                  },
                ]
              : []),
            ...(i > 0
              ? [
                  {
                    nodeId: sorted[i - 1].id,
                    position: { yaw: "180deg", pitch: "0deg" },
                  },
                ]
              : []),
          ],
        }));

        const viewer = new Viewer({
          container: containerRef.current,
          panorama: sorted[0].panoUrl,
          loadingTxt: "Loading tour…",
          navbar: ["zoom", "move", "fullscreen"],
          defaultZoomLvl: 40,
          minFov: 40,
          maxFov: 95,
          mousewheel: true,
          touchmoveTwoFingers: false,
          plugins: [
            [
              VirtualTourPlugin,
              {
                dataMode: "client",
                positionMode: "manual",
                renderMode: "3d",
                nodes,
                startNodeId: sorted[0].id,
                transitionOptions: {
                  showLoader: true,
                  speed: "25rpm",
                  effect: "fade",
                  rotation: true,
                },
              },
            ],
          ],
        });

        viewerRef.current = viewer;

        viewer.addEventListener("ready", () => {
          if (cancelled) return;
          clearTimeout(timeout);
          setStatus("ready");
        });

        const vtEvents = await import("@photo-sphere-viewer/virtual-tour-plugin");
        const tour = viewer.getPlugin(VirtualTourPlugin);
        tour?.addEventListener(vtEvents.events.NodeChangedEvent, (e) => {
          // ← read roomName from node
          const nodeName = (e as { node?: { name?: string } }).node?.name;
          if (nodeName) setCurrentName(nodeName);
        });
      } catch (err) {
        console.error("Tour init failed:", err);
        clearTimeout(timeout);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      try {
        viewerRef.current?.destroy();
      } catch {
        /* noop */
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes.map((s) => s.id).join(",")]);

  if (scenes.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl bg-brand-950"
        style={{ height: 320 }}
      />

      {/* room name badge */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span className="rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-300 backdrop-blur">
          3D Tour
        </span>
        {status === "ready" && currentName && (
          <span className="rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-brand-900 backdrop-blur">
            {currentName}
          </span>
        )}
      </div>

      {/* loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-brand-950 text-cream-100">
          <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
          <p className="text-xs font-medium text-cream-200/80">
            Loading 3D walkthrough…
          </p>
          <p className="text-[10px] text-cream-200/50">
            This may take a moment on first load
          </p>
        </div>
      )}

      {/* error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-brand-950 text-cream-200">
          <AlertCircle className="h-8 w-8 text-gold-400" />
          <p className="text-sm font-semibold">3D tour unavailable</p>
          <p className="px-6 text-center text-xs text-cream-200/60">
            The owner has not yet uploaded panorama photos.
            Check the regular photos above.
          </p>
        </div>
      )}
    </div>
  );
}