"use client";
import { useEffect, useState, useCallback } from "react";
import { Heart, Search, X, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatGHS } from "@/lib/format";

interface FavProperty {
  id: string;
  title: string;
  listingType: string;
  price: number;
  pricePeriod: string;
  city: string;
  area: string;
  region: string;
  images: string[];
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
}

/* ── Hook ── */
function useFavourites() {
  const getIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem("gha_favs") ?? "[]");
    } catch {
      return [];
    }
  };

  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getIds());
    const onStorage = () => setIds(getIds());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = (id: string) => {
    const current = getIds();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [id, ...current];
    localStorage.setItem("gha_favs", JSON.stringify(next));
    setIds(next);
  };

  const isFav = (id: string) => ids.includes(id);

  return { ids, toggle, isFav };
}

export { useFavourites };

/* ── Props — onSelect is optional so existing usages without it still compile ── */
interface Props {
  onSelect?: (id: string) => void;
}

export default function FavouritesTab({ onSelect }: Props) {
  const { ids, toggle, isFav } = useFavourites();
  const [properties, setProperties] = useState<FavProperty[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");

  const fetchFavs = useCallback(async () => {
    if (ids.length === 0) { setProperties([]); return; }
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/properties/${id}`).then((r) => r.json()))
      );
      const props = results
        .filter((r): r is PromiseFulfilledResult<{ property: FavProperty }> =>
          r.status === "fulfilled" && r.value?.property
        )
        .map((r) => r.value.property);
      setProperties(props);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ids]);

  useEffect(() => { fetchFavs(); }, [fetchFavs]);

  const filtered = search.trim()
    ? properties.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q)
        );
      })
    : properties;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pb-3">
        <h1
          className="font-display text-2xl font-bold mb-3"
          style={{ color: "var(--text-main)" }}
        >
          Saved Homes
        </h1>
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}
        >
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved homes…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-main)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} type="button">
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll px-4 pb-6 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: "#0c3b2e" }} />
          </div>
        )}

        {!loading && ids.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Heart size={52} style={{ color: "var(--border-col)" }} />
            <h3
              className="mt-4 font-display text-xl font-bold"
              style={{ color: "var(--text-main)" }}
            >
              No saved homes yet
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Tap the heart icon on any property to save it here.
            </p>
          </div>
        )}

        {!loading && ids.length > 0 && filtered.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
            No saved homes match your search.
          </p>
        )}

        {!loading &&
          filtered.map((p) => {
            const isRent = p.listingType === "rent";
            const img    = p.images?.find((u) => u.startsWith("http")) ?? null;

            return (
              <div
                key={p.id}
                className="rounded-2xl overflow-hidden flex"
                style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}
              >
                {/* Image — tapping opens on map if onSelect provided, else goes to detail page */}
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className="shrink-0"
                  >
                    <div
                      className="w-28 h-28 flex items-center justify-center"
                      style={{ background: "var(--surface-2)" }}
                    >
                      {img ? (
                        <img src={img} className="w-full h-full object-cover" alt={p.title} />
                      ) : (
                        <MapPin size={28} style={{ color: "var(--border-col)" }} />
                      )}
                    </div>
                  </button>
                ) : (
                  <Link href={`/property/${p.id}`} className="shrink-0">
                    <div
                      className="w-28 h-28 flex items-center justify-center"
                      style={{ background: "var(--surface-2)" }}
                    >
                      {img ? (
                        <img src={img} className="w-full h-full object-cover" alt={p.title} />
                      ) : (
                        <MapPin size={28} style={{ color: "var(--border-col)" }} />
                      )}
                    </div>
                  </Link>
                )}

                {/* Info */}
                <div className="flex-1 p-3 min-w-0">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase mb-1"
                    style={{
                      background: isRent ? "#fee2e2" : "#dcfce7",
                      color:      isRent ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {isRent ? "Rent" : "Sale"}
                  </span>

                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(p.id)}
                      className="text-left w-full"
                    >
                      <p
                        className="text-sm font-bold leading-tight truncate"
                        style={{ color: "var(--text-main)" }}
                      >
                        {p.title}
                      </p>
                    </button>
                  ) : (
                    <Link href={`/property/${p.id}`}>
                      <p
                        className="text-sm font-bold leading-tight truncate"
                        style={{ color: "var(--text-main)" }}
                      >
                        {p.title}
                      </p>
                    </Link>
                  )}

                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {p.area}, {p.city}
                  </p>

                  <p
                    className="font-display text-lg font-bold mt-1"
                    style={{ color: "#0c3b2e" }}
                  >
                    {formatGHS(p.price)}
                    {isRent && (
                      <span className="text-xs font-medium ml-0.5" style={{ color: "var(--text-muted)" }}>
                        /{p.pricePeriod}
                      </span>
                    )}
                  </p>
                </div>

                {/* Remove heart */}
                <button
                  onClick={() => toggle(p.id)}
                  type="button"
                  className="px-3 flex items-start pt-3"
                >
                  <Heart
                    size={20}
                    className={isFav(p.id) ? "fill-red-500" : ""}
                    style={{ color: isFav(p.id) ? "#ef4444" : "var(--text-muted)" }}
                  />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}