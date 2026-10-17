import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username?.trim() || !password)
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .limit(1);

    if (!user)
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );

    const valid = await compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );

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
    console.error("[login]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}