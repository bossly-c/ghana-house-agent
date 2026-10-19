import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/db";                   // ✅ correct path
import { properties } from "@/db/schema";    // ✅ correct path
import { eq } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "gha_super_secret_jwt_key_2026"
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET);
    const agentId = String(payload.id);

    const { id } = await params;
    const { isVisible } = await req.json() as { isVisible: boolean };

    const [prop] = await db
      .select({ agentId: properties.agentId })
      .from(properties)
      .where(eq(properties.id, id));

    if (!prop)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(prop.agentId) !== agentId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db
      .update(properties)
      .set({ isVisible })
      .where(eq(properties.id, id));

    return NextResponse.json({ ok: true, isVisible });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}