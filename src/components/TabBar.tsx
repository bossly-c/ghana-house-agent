"use client";
import { Map, Heart, User, Settings } from "lucide-react";

export type Tab = "map" | "favourites" | "profile" | "settings";

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
  favCount?: number;
}

export default function TabBar({ active, onChange, favCount = 0 }: Props) {
  const tabs: { id: Tab; icon: typeof Map; label: string }[] = [
    { id: "map",        icon: Map,      label: "Map"       },
    { id: "favourites", icon: Heart,    label: "Saved"     },
    { id: "profile",    icon: User,     label: "Profile"   },
    { id: "settings",  icon: Settings, label: "Settings"  },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background:    "var(--surface)",
        borderTop:     "1px solid var(--border-col)",
        paddingBottom: "var(--sab)",
      }}
    >
      {tabs.map(({ id, icon: Icon, label }) => {
        const active_ = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
            type="button"
          >
            <div className="relative">
              <Icon
                size={22}
                style={{ color: active_ ? "#f2b70a" : "var(--text-muted)" }}
                className={id === "favourites" && active_ ? "fill-[#f2b70a]" : ""}
              />
              {/* Badge for favourites */}
              {id === "favourites" && favCount > 0 && (
                <span
                  className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold"
                  style={{ background: "#e5484d", color: "#fff" }}
                >
                  {favCount > 99 ? "99+" : favCount}
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: active_ ? "#f2b70a" : "var(--text-muted)" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}