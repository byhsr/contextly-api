import { Context } from "hono";
import { eq, and, isNull, like } from "drizzle-orm";
import { createDb } from "../db";
import { contexts } from "../db/schema";

export async function getContexts(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");

  const all = await db
    .select()
    .from(contexts)
    .where(eq(contexts.userId, userId))
    .all();

  return c.json({ ok: true, contexts: all });
}

export async function createContext(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { key, value, parentId, actorType = "USER", actorId = userId } = await c.req.json();

  if (!key || !value) {
    return c.json({ ok: false, message: "key and value are required" }, 400);
  }

  const now = new Date().toISOString();
  const context = {
    id: globalThis.crypto.randomUUID(),
    userId,
    actorType,
    actorId,
    key,
    value,
    parentId: parentId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(contexts).values(context);
  return c.json({ ok: true, context }, 201);
}

export async function updateContext(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { id } = c.req.param();
  const { key, value, actorType, actorId } = await c.req.json();

  const existing = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ ok: false, message: "Context not found" }, 404);
  }

  const updated = await db
    .update(contexts)
    .set({
      ...(key && { key }),
      ...(value && { value }),
      ...(actorType && { actorType }),
      ...(actorId && { actorId }),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
    .returning()
    .get();

  return c.json({ ok: true, context: updated });
}

export async function deleteContext(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { id } = c.req.param();

  const existing = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ ok: false, message: "Context not found" }, 404);
  }

  await db
    .delete(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.userId, userId)));

  return c.json({ ok: true, message: "Deleted" });
}

export async function getContext(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { id } = c.req.param();

  const context = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
    .get();

  if (!context) {
    return c.json({ ok: false, message: "Context not found" }, 404);
  }

  const children = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.parentId, id), eq(contexts.userId, userId)))
    .all();

  return c.json({ ok: true, context: { ...context, children } });
}

export async function getContextTree(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { id } = c.req.param();

  // fetch all user contexts in one query, build tree in memory
  const all = await db
    .select()
    .from(contexts)
    .where(eq(contexts.userId, userId))
    .all();

  const map = new Map(all.map((ctx) => [ctx.id, { ...ctx, children: [] as any[] }]));

  // check root exists and belongs to user
  if (!map.has(id)) {
    return c.json({ ok: false, message: "Context not found" }, 404);
  }

  // wire children to parents
  for (const ctx of map.values()) {
    if (ctx.parentId && map.has(ctx.parentId)) {
      map.get(ctx.parentId)!.children.push(ctx);
    }
  }

  return c.json({ ok: true, tree: map.get(id) });
}

export async function searchContexts(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const q = c.req.query("q")?.trim();

  if (!q) {
    return c.json({ ok: false, message: "q is required" }, 400);
  }

  const results = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.userId, userId), like(contexts.key, `${q}%`)))
    .limit(10)
    .all();

  return c.json({ ok: true, contexts: results });
}