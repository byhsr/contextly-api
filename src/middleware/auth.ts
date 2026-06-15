import { Context, Next } from "hono";
import { verifyToken } from "../lib/jwt";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, message: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set("userId", payload.sub!);
    await next();
  } catch {
    return c.json({ ok: false, message: "Invalid or expired token" }, 401);
  }
}