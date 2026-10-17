// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

// ── Simple in-memory rate limiter ──────────────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateMap.forEach((value, key) => {
    if (now > value.resetAt) rateMap.delete(key);
  });
}, 5 * 60 * 1000);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);

  // Different limits per route
  let limit = 60;
  let windowMs = 60_000;

  if (pathname === "/api/properties" && req.method === "POST") {
    limit = 5;
    windowMs = 60 * 60_000;
  } else if (pathname === "/api/viewings" && req.method === "POST") {
    limit = 10;
    windowMs = 60 * 60_000;
  } else if (pathname.startsWith("/api/properties")) {
    limit = 120;
    windowMs = 60_000;
  }

  const { allowed, remaining } = rateLimit(
    `${ip}:${pathname}:${req.method}`,
    limit,
    windowMs
  );

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Too many requests — please slow down.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Block POST requests without JSON content type
  const contentType = req.headers.get("content-type") || "";
  if (req.method === "POST" && !contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  return res;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};