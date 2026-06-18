import { z } from "zod";
import { eq, and, like } from "drizzle-orm";
import { contexts } from "../../db/schema";

export function registerContextTools(server: any, db: any, userId: string) {
  server.registerTool("get_contexts", { description: "List all context nodes for the user", inputSchema: z.object({}) }, async () => {
    const all = await db.select().from(contexts).where(eq(contexts.userId, userId)).all();
    return { content: [{ type: "text", text: JSON.stringify(all, null, 2) }] };
  });

  server.registerTool("get_context", { description: "Get a context node and its direct children", inputSchema: z.object({ id: z.string() }) }, async ({ id }: { id: string }) => {
    const context = await db.select().from(contexts).where(and(eq(contexts.id, id), eq(contexts.userId, userId))).get();
    if (!context) return { content: [{ type: "text", text: "Context not found" }], isError: true };
    const children = await db.select().from(contexts).where(and(eq(contexts.parentId, id), eq(contexts.userId, userId))).all();
    return { content: [{ type: "text", text: JSON.stringify({ ...context, children }, null, 2) }] };
  });

  server.registerTool("get_context_tree", { description: "Get a context node and its full nested subtree", inputSchema: z.object({ id: z.string() }) }, async ({ id }: { id: string }) => {
    const all = await db.select().from(contexts).where(eq(contexts.userId, userId)).all();
    const map = new Map(all.map((ctx: any) => [ctx.id, { ...ctx, children: [] as any[] }]));
    if (!map.has(id)) return { content: [{ type: "text", text: "Context not found" }], isError: true };
    for (const ctx of map.values()) {
      if ((ctx as any).parentId && map.has((ctx as any).parentId)) {
        (map.get((ctx as any).parentId) as any).children.push(ctx);
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(map.get(id), null, 2) }] };
  });

  server.registerTool("search_contexts", { description: "Search context nodes by key prefix", inputSchema: z.object({ q: z.string() }) }, async ({ q }: { q: string }) => {
    const results = await db.select().from(contexts).where(and(eq(contexts.userId, userId), like(contexts.key, `${q}%`))).limit(10).all();
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  });

server.registerTool("create_context", {
  description: "Create a new context node",
  inputSchema: z.object({
    key: z.string(),
    value: z.string(),
    parentId: z.string().optional(),
    actorType: z.enum(["USER", "AGENT", "SYSTEM"]).default("AGENT"),
    actorId: z.string().optional(),
  })
}, async ({ key, value, parentId, actorType, actorId }: { key: string; value: string; parentId?: string; actorType: string; actorId?: string }) => {
  const now = new Date().toISOString();
  const context = { id: globalThis.crypto.randomUUID(), userId, actorType, actorId: actorId ?? userId, key, value, parentId: parentId ?? null, createdAt: now, updatedAt: now };
  await db.insert(contexts).values(context);
  return { content: [{ type: "text", text: JSON.stringify(context, null, 2) }] };
});

server.registerTool("update_context", {
  description: "Update an existing context node",
  inputSchema: z.object({
    id: z.string(),
    key: z.string().optional(),
    value: z.string().optional(),
    actorType: z.enum(["USER", "AGENT", "SYSTEM"]).optional(),
    actorId: z.string().optional(),
  })
}, async ({ id, key, value, actorType, actorId }: { id: string; key?: string; value?: string; actorType?: string; actorId?: string }) => {
  const existing = await db.select().from(contexts).where(and(eq(contexts.id, id), eq(contexts.userId, userId))).get();
  if (!existing) return { content: [{ type: "text", text: "Context not found" }], isError: true };
  const updated = await db.update(contexts).set({
    ...(key && { key }),
    ...(value && { value }),
    ...(actorType && { actorType }),
    ...(actorId && { actorId }),
    updatedAt: new Date().toISOString()
  }).where(and(eq(contexts.id, id), eq(contexts.userId, userId))).returning().get();
  return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
});

  server.registerTool("delete_context", { description: "Delete a context node", inputSchema: z.object({ id: z.string() }) }, async ({ id }: { id: string }) => {
    const existing = await db.select().from(contexts).where(and(eq(contexts.id, id), eq(contexts.userId, userId))).get();
    if (!existing) return { content: [{ type: "text", text: "Context not found" }], isError: true };
    await db.delete(contexts).where(and(eq(contexts.id, id), eq(contexts.userId, userId)));
    return { content: [{ type: "text", text: `Deleted context ${id}` }] };
  });
}