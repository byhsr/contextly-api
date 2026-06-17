import { Context } from "hono";
import { eq, and , inArray} from "drizzle-orm";
import { createDb } from "../db";
import { sessions } from "../db/schema";

export async function get(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const n = Number(c.req.query("n") ?? 1);

  const dates = Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  const results = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), inArray(sessions.date, dates)))
    .all();

  return c.json({ ok: true, sessions: results });
}



export async function create(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { content } = await c.req.json();
  const date = new Date().toISOString().split("T")[0];

  if (!content) return c.json({ ok: false, message: "content is required" }, 400);

  const existing = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.date, date)))
    .get();

  if (existing) return c.json({ ok: false, message: "Session already exists, use PATCH" }, 409);

  const now = new Date().toISOString();
  const session = {
    id: globalThis.crypto.randomUUID(),
    userId,
    date,
    content,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(sessions).values(session);
  return c.json({ ok: true, session }, 201);
}

export async function update(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { content } = await c.req.json();
  const date = new Date().toISOString().split("T")[0];

  if (!content) return c.json({ ok: false, message: "content is required" }, 400);

  const existing = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.date, date)))
    .get();

  if (!existing) return c.json({ ok: false, message: "No session for today" }, 404);

  const updated = await db
    .update(sessions)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(and(eq(sessions.userId, userId), eq(sessions.date, date)))
    .returning()
    .get();

  return c.json({ ok: true, session: updated });
}