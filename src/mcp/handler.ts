import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { eq, and, like, desc } from "drizzle-orm";
import { createDb } from "../db";
import { contexts, dumps } from "../db/schema";

export function createMcpServer(db: ReturnType<typeof createDb>, userId: string) {
  const server = new McpServer({
    name: "contextly",
    version: "1.0.0",
  });

  // --- list all contexts ---
  server.registerTool(
    "get_contexts",
    {
      description: "List all context nodes for the user",
      inputSchema: z.object({}),
    },
    async () => {
      const all = await db
        .select()
        .from(contexts)
        .where(eq(contexts.userId, userId))
        .all();

      return {
        content: [{ type: "text", text: JSON.stringify(all, null, 2) }],
      };
    }
  );

  // --- get single context + children ---
  server.registerTool(
    "get_context",
    {
      description: "Get a context node and its direct children",
      inputSchema: z.object({
        id: z.string().describe("Context node ID"),
      }),
    },
    async ({ id }) => {
      const context = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
        .get();

      if (!context) {
        return { content: [{ type: "text", text: "Context not found" }], isError: true };
      }

      const children = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.parentId, id), eq(contexts.userId, userId)))
        .all();

      return {
        content: [{ type: "text", text: JSON.stringify({ ...context, children }, null, 2) }],
      };
    }
  );

  // --- get full subtree ---
  server.registerTool(
    "get_context_tree",
    {
      description: "Get a context node and its full nested subtree",
      inputSchema: z.object({
        id: z.string().describe("Root context node ID"),
      }),
    },
    async ({ id }) => {
      const all = await db
        .select()
        .from(contexts)
        .where(eq(contexts.userId, userId))
        .all();

      const map = new Map(all.map((ctx) => [ctx.id, { ...ctx, children: [] as any[] }]));

      if (!map.has(id)) {
        return { content: [{ type: "text", text: "Context not found" }], isError: true };
      }

      for (const ctx of map.values()) {
        if (ctx.parentId && map.has(ctx.parentId)) {
          map.get(ctx.parentId)!.children.push(ctx);
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(map.get(id), null, 2) }],
      };
    }
  );

  // --- search contexts ---
  server.registerTool(
    "search_contexts",
    {
      description: "Search context nodes by key prefix",
      inputSchema: z.object({
        q: z.string().describe("Key prefix to search for"),
      }),
    },
    async ({ q }) => {
      const results = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.userId, userId), like(contexts.key, `${q}%`)))
        .limit(10)
        .all();

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // --- create context ---
  server.registerTool(
    "create_context",
    {
      description: "Create a new context node",
      inputSchema: z.object({
        key: z.string().describe("Context key / name"),
        value: z.string().describe("Context value / content"),
        parentId: z.string().optional().describe("Parent node ID (optional)"),
      }),
    },
    async ({ key, value, parentId }) => {
      const now = new Date().toISOString();
      const context = {
        id: globalThis.crypto.randomUUID(),
        userId,
        key,
        value,
        parentId: parentId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(contexts).values(context);

      return {
        content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
      };
    }
  );

  // --- update context ---
  server.registerTool(
    "update_context",
    {
      description: "Update an existing context node",
      inputSchema: z.object({
        id: z.string().describe("Context node ID"),
        key: z.string().optional().describe("New key"),
        value: z.string().optional().describe("New value"),
      }),
    },
    async ({ id, key, value }) => {
      const existing = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
        .get();

      if (!existing) {
        return { content: [{ type: "text", text: "Context not found" }], isError: true };
      }

      const updated = await db
        .update(contexts)
        .set({
          ...(key && { key }),
          ...(value && { value }),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
        .returning()
        .get();

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // --- delete context ---
  server.registerTool(
    "delete_context",
    {
      description: "Delete a context node",
      inputSchema: z.object({
        id: z.string().describe("Context node ID"),
      }),
    },
    async ({ id }) => {
      const existing = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.id, id), eq(contexts.userId, userId)))
        .get();

      if (!existing) {
        return { content: [{ type: "text", text: "Context not found" }], isError: true };
      }

      await db
        .delete(contexts)
        .where(and(eq(contexts.id, id), eq(contexts.userId, userId)));

      return {
        content: [{ type: "text", text: `Deleted context ${id}` }],
      };
    }
  );

  // --- create dump ---
server.registerTool(
  "create_dump",
  {
    description: "Create a new dump (free-form content) under a context node",
    inputSchema: z.object({
      contextId: z.string().describe("Context node ID to attach the dump to"),
      content: z.string().min(1).describe("The content to dump"),
    }),
  },
  async ({ contextId, content }) => {
    const context = await db
      .select()
      .from(contexts)
      .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)))
      .get();

    if (!context) {
      return { content: [{ type: "text", text: "Context not found" }], isError: true };
    }

    const dump = {
      id: globalThis.crypto.randomUUID(),
      contextId,
      userId,
      content,
      createdAt: new Date().toISOString(),
    };

    await db.insert(dumps).values(dump);

    return {
      content: [{ type: "text", text: JSON.stringify(dump, null, 2) }],
    };
  }
);

// --- get dumps ---
server.registerTool(
  "get_dumps",
  {
    description: "Get the most recent dumps for a context node",
    inputSchema: z.object({
      contextId: z.string().describe("Context node ID"),
      n: z.number().int().min(1).max(100).default(10).describe("Number of most recent dumps to fetch"),
    }),
  },
  async ({ contextId, n }) => {
    const context = await db
      .select()
      .from(contexts)
      .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)))
      .get();

    if (!context) {
      return { content: [{ type: "text", text: "Context not found" }], isError: true };
    }

    const results = await db
      .select()
      .from(dumps)
      .where(and(eq(dumps.contextId, contextId), eq(dumps.userId, userId)))
      .orderBy(desc(dumps.createdAt))
      .limit(n)
      .all();

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);
  return server;
}


