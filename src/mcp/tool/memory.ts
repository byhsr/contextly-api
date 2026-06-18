// src/mcp/tools/memory.ts
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { scopes, sessions, sessionEntries, contexts, dumps } from "../../db/schema";

export function registerMemoryTools(server: any, db: any, userId: string) {
  server.registerTool(
    "get_working_memory",
    {
      description:
        "Returns a snapshot of current working memory for a scope: recent session entries, relevant contexts, and recent dumps. This is your first call when starting any work session.",
      inputSchema: z.object({
        scopeId: z.string().describe("Scope ID to fetch working memory for"),
        sessionEntryLimit: z.number().int().min(1).max(50).default(20).describe("Recent session entries to fetch"),
        contextLimit: z.number().int().min(1).max(50).default(20).describe("Contexts to fetch"),
        dumpLimit: z.number().int().min(1).max(20).default(5).describe("Recent dumps to fetch"),
      }),
    },
    async ({ scopeId, sessionEntryLimit, contextLimit, dumpLimit }: {
      scopeId: string;
      sessionEntryLimit: number;
      contextLimit: number;
      dumpLimit: number;
    }) => {
      const scope = await db
        .select()
        .from(scopes)
        .where(and(eq(scopes.id, scopeId), eq(scopes.userId, userId)))
        .get();

      if (!scope) {
        return { content: [{ type: "text", text: "Scope not found" }], isError: true };
      }

      const scopeSessions = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.scopeId, scopeId)))
        .all();

      const sessionIds = scopeSessions.map((s: any) => s.id);

      const recentEntries = sessionIds.length > 0
        ? await db
            .select()
            .from(sessionEntries)
            .where(and(eq(sessionEntries.userId, userId), inArray(sessionEntries.sessionId, sessionIds)))
            .orderBy(desc(sessionEntries.createdAt))
            .limit(sessionEntryLimit)
            .all()
        : [];

      const scopeContexts = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.userId, userId), eq(contexts.scopeId, scopeId)))
        .limit(contextLimit)
        .all();

      const recentDumps = await db
        .select()
        .from(dumps)
        .where(and(eq(dumps.userId, userId), eq(dumps.scopeId, scopeId)))
        .orderBy(desc(dumps.createdAt))
        .limit(dumpLimit)
        .all();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { scope, sessionEntries: recentEntries, contexts: scopeContexts, dumps: recentDumps },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}