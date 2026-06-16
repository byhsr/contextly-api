import { Context } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "../db";
import { dumps, contexts } from "../db/schema";

export async function createDump(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { contextId } = c.req.param();
  const { content } = await c.req.json();

  if (!content) return c.json({ ok: false, message: "content is required" }, 400);

  // verify context belongs to user
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
  const n = Number(c.req.query("n") ?? 1);

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