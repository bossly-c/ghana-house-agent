// src/app/api/viewings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createViewing } from "@/lib/queries";
import { validateCreateViewing } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // ── Validate ────────────────────────────────────────────────────
    const validation = validateCreateViewing(body as Record<string, unknown>);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fields: validation.errors,
        },
        { status: 422 }
      );
    }

    const row = await createViewing({
      propertyId: String(body.propertyId),
      name:       String(body.name).trim().slice(0, 80),
      phone:      String(body.phone).trim().slice(0, 20),
      day:        String(body.day).slice(0, 20),
      note:       body.note ? String(body.note).trim().slice(0, 500) : undefined,
    });

    return NextResponse.json({ booking: row }, { status: 201 });
  } catch (e) {
    console.error("POST /api/viewings failed:", e);
    return NextResponse.json(
      { error: "Failed to book viewing" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}