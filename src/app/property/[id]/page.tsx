import { notFound } from "next/navigation";
import { getProperty } from "@/lib/queries";
import PropertyPageView from "@/components/PropertyPageView";

export const dynamic = "force-dynamic";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();
  return <PropertyPageView property={property} />;
}
