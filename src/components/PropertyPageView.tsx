"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Images,
  MapPin,
  Navigation,
  Orbit,
  Share2,
  Sparkles,
} from "lucide-react";
import type { PropertyDetail } from "@/lib/types";
import { formatGHS, periodLabel } from "@/lib/format";
import BookingForm from "./BookingForm";
import TourViewer from "./TourViewer";
import {
  AgentCard,
  Amenities,
  Gallery,
  KeyStats,
  ListingBadge,
  ViewsLine,
} from "./shared-bits";

export default function PropertyPageView({
  property,
}: {
  property: PropertyDetail;
}) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`;

  const share = async () => {
    const data = {
      title: property.title,
      text: `${property.title} — ${formatGHS(property.price)} on Ghana House Agent`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(window.location.href);
        window.alert("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cream-100">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-brand-900/97 text-cream-50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Back to map"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <p className="min-w-0 flex-1 truncate text-sm font-bold">
            {property.title}
          </p>
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-full bg-gold-400 px-3.5 py-2 text-xs font-extrabold text-brand-950 transition hover:bg-gold-300 active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-24 pt-5">
        {/* header info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ListingBadge listing={property.listingType} />
            <span className="rounded-full bg-brand-800 px-3 py-1.5 text-[11px] font-bold text-cream-100">
              {property.propertyType}
            </span>
            <ViewsLine views={property.views} />
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-5xl font-bold tracking-tight text-brand-950">
                {formatGHS(property.price)}
                <span className="ml-1 align-baseline text-lg font-bold text-brand-400">
                  {periodLabel(property.pricePeriod)}
                </span>
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-sm font-bold text-brand-800">
                <MapPin className="h-4 w-4 text-rent" />
                {property.area} · {property.city}, {property.region}
              </p>
            </div>
          </div>
        </div>

        <Gallery images={property.images} title={property.title} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section>
              <h2 className="mb-2.5 font-display text-xl font-semibold text-brand-950">
                Inside the {property.propertyType.toLowerCase()}
              </h2>
              <KeyStats p={property} />
            </section>

            {property.description && (
              <section>
                <h2 className="mb-2 font-display text-xl font-semibold text-brand-950">
                  About this place
                </h2>
                <p className="text-sm leading-relaxed text-stone-600">
                  {property.description}
                </p>
              </section>
            )}

            {property.amenities.length > 0 && (
              <section>
                <h2 className="mb-2.5 font-display text-xl font-semibold text-brand-950">
                  What it comes with
                </h2>
                <Amenities items={property.amenities} />
              </section>
            )}

            {(property.scenes?.length ?? 0) > 0 && (
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-brand-950">
                    <Orbit className="h-5 w-5 text-gold-500" />
                    Walk through in 3D
                  </h2>
                  <span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[10px] font-bold text-gold-600">
                    {property.scenes.length} rooms
                  </span>
                </div>
                <TourViewer scenes={property.scenes} title={property.area} />
                <p className="mt-2 text-center text-xs font-medium text-brand-400">
                  Drag to look around · tap a glowing arrow to move into the
                  next space
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-brand-100 bg-white p-4">
              <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold text-brand-950">
                <MapPin className="h-4.5 w-4.5 text-rent" />
                Where it is
              </h2>
              <p className="text-sm font-semibold text-brand-900">
                {property.area}
              </p>
              <p className="text-xs text-brand-500">
                {property.address ? `${property.address} · ` : ""}
                {property.city}, {property.region} Region, Ghana
              </p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-800 py-3 text-sm font-extrabold text-brand-800 transition hover:bg-brand-800 hover:text-cream-50"
              >
                <Navigation className="h-4 w-4" />
                Get directions
              </a>
            </section>
          </div>

          {/* side column */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-brand-100 bg-cream-50 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-brand-950">
                <Sparkles className="h-5 w-5 text-gold-500" />
                Book a viewing
              </h2>
              <BookingForm
                propertyId={property.id}
                viewingDays={property.viewingDays}
                viewingTime={property.viewingTime}
                listingType={property.listingType}
              />
            </div>
            <AgentCard p={property} />
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white py-3.5 text-sm font-extrabold text-brand-800 transition hover:bg-brand-50"
            >
              <Images className="h-4 w-4" />
              Back to the map
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}