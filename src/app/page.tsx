import { Suspense } from "react";
import HomeClient from "@/components/HomeClient";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-brand-950">
          <p className="font-display text-lg font-semibold text-gold-300">
            Ghana House Agent
          </p>
        </div>
      }
    >
      <HomeClient />
    </Suspense>
  );
}
