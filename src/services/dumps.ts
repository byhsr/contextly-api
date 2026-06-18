import { Context } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "../db";
import { dumps, contexts } from "../db/schema";

export async function createDump(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { contextId } = c.req.param();

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, message: "Invalid JSON body" }, 400);

  const { content, actorType = "USER", actorId = userId } = body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return c.json({ ok: false, message: "content is required" }, 400);
  }

  const context = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)))
    .get();

  if (!context) return c.json({ ok: false, message: "Context not found" }, 404);

  const dump = {
    id: globalThis.crypto.randomUUID(),
    contextId,
    userId,
    actorType,
    actorId,
    content,
    createdAt: new Date().toISOString(),
  };

  await db.insert(dumps).values(dump);
  return c.json({ ok: true, dump }, 201);
}

export async function getDumps(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { contextId } = c.req.param();

  const rawN = c.req.query("n");
  const n = rawN !== undefined ? Number(rawN) : 1;
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    return c.json({ ok: false, message: "n must be an integer between 1 and 100" }, 400);
  }

  const context = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)))
    .get();

  if (!context) return c.json({ ok: false, message: "Context not found" }, 404);

  const results = await db
    .select()
    .from(dumps)
    .where(and(eq(dumps.contextId, contextId), eq(dumps.userId, userId)))
    .orderBy(desc(dumps.createdAt))
    .limit(n)
    .all();

  return c.json({ ok: true, dumps: results });
}