import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, phone, whatsapp, username, password, profilePicUrl } =
      await req.json();

    if (!name?.trim() || !phone?.trim() || !whatsapp?.trim() || !username?.trim() || !password)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });

    if (password.length < 5)
      return NextResponse.json(
        { error: "Password must be at least 5 characters" },
        { status: 400 }
      );

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0)
      return NextResponse.json(
        { error: "Username is already taken — choose another" },
        { status: 409 }
      );

    const passwordHash = await hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        name:          name.trim(),
        phone:         phone.trim(),
        whatsapp:      whatsapp.trim(),
        username:      username.toLowerCase().trim(),
        passwordHash,
        profilePicUrl: profilePicUrl ?? null,
      })
      .returning();

    const token = await signToken({
      id:            user.id,
      name:          user.name,
      phone:         user.phone,
      whatsapp:      user.whatsapp,
      username:      user.username,
      profilePicUrl: user.profilePicUrl,
    });

    const { passwordHash: _omit, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}