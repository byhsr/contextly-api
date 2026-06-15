import { Context } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { createDb } from "../db";
import { users } from "../db/schema";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../lib/jwt";

export async function signup(c: Context) {
  const db = createDb(c.env.DB);
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ ok: false, message: "Email and password are required" }, 400);
  }

  const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
  if (existingUser) {
    return c.json({ ok: false, message: "User already exists" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: globalThis.crypto.randomUUID(),
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await db.insert(users).values(user);

  return c.json({ ok: true, user: { id: user.id, email: user.email } }, 201);
}

export async function login(c: Context) {
  const db = createDb(c.env.DB);
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ ok: false, message: "Email and password are required" }, 400);
  }

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    return c.json({ ok: false, message: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ ok: false, message: "Invalid credentials" }, 401);
  }

  const secret = c.env.JWT_SECRET;
  const accessToken = await generateAccessToken(user.id, secret);
  const refreshToken = await generateRefreshToken(user.id, secret);

  return c.json({
    ok: true,
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email },
  });
}

export async function refresh(c: Context) {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ ok: false, message: "Refresh token required" }, 400);
  }

  try {
    const payload = await verifyToken(refreshToken, c.env.JWT_SECRET);
    const accessToken = await generateAccessToken(payload.sub!, c.env.JWT_SECRET);
    return c.json({ ok: true, accessToken });
  } catch {
    return c.json({ ok: false, message: "Invalid or expired refresh token" }, 401);
  }
}

export async function logout(c: Context) {
  // Stateless JWT — client drops tokens
  // If you add a refresh token blocklist (D1 table) later, invalidate here
  return c.json({ ok: true, message: "Logged out" });
}

export async function me(c: Context) {
  // Will be protected by auth middleware — userId injected into context
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ ok: false, message: "Unauthorized" }, 401);
  }

  const db = createDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    return c.json({ ok: false, message: "User not found" }, 404);
  }

  return c.json({ ok: true, user: { id: user.id, email: user.email } });
}