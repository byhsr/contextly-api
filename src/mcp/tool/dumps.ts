import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { contexts, dumps } from "../../db/schema";

export function registerDumpTools(server: any, db: any, userId: string) {
  server.registerTool("create_dump", { description: "Create a new dump under a context node", inputSchema: z.object({ contextId: z.string(), content: z.string().min(1) }) }, async ({ contextId, content }: { contextId: string; content: string }) => {
    const context = await db.select().from(contexts).where(and(eq(contexts.id, contextId), eq(contexts.userId, userId))).get();
    if (!context) return { content: [{ type: "text", text: "Context not found" }], isError: true };
    const dump = { id: globalThis.crypto.randomUUID(), contextId, userId, content, createdAt: new Date().toISOString() };
    await db.insert(dumps).values(dump);
    return { content: [{ type: "text", text: JSON.stringify(dump, null, 2) }] };
  });

  server.registerTool("get_dumps", { description: "Get most recent dumps for a context node", inputSchema: z.object({ contextId: z.string(), n: z.number().int().min(1).max(100).default(10) }) }, async ({ contextId, n }: { contextId: string; n: number }) => {
    const context = await db.select().from(contexts).where(and(eq(contexts.id, contextId), eq(contexts.userId, userId))).get();
    if (!context) return { content: [{ type: "text", text: "Context not found" }], isError: true };
    const results = await db.select().from(dumps).where(and(eq(dumps.contextId, contextId), eq(dumps.userId, userId))).orderBy(desc(dumps.createdAt)).limit(n).all();
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  });
}