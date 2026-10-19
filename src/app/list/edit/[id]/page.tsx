import { Suspense } from "react";
import EditListingClient from "./EditListingClient";

export default function EditListingPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-zinc-400 text-sm">Loading…</div>
      </div>
    }>
      <EditListingClient />
    </Suspense>
  );
}