import { z } from "zod";
import { eq, and, inArray, desc } from "drizzle-orm";
import { sessions, sessionEntries, users } from "../../db/schema";
import { getLocalDate } from "../../lib/personalization";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function resolveOrCreateSession(
    db: any,
    userId: string,
    date: string
) {
    const existing = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.date, date)))
        .get();

    if (existing) return existing;

    const now = new Date().toISOString();
    const session = {
        id: globalThis.crypto.randomUUID(),
        userId,
        scopeId: null,
        date,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(sessions).values(session);
    return session;
}

// ─── register tools ───────────────────────────────────────────────────────────

export function registerSessionTools(server: any, db: any, userId: string) {

    // ── create_session_entry ───────────────────────────────────────────────────
    server.registerTool(
        "create_session_entry",
        {
            description:
                "Append a new entry to today's session. Creates the session automatically if it doesn't exist. Never overwrites previous entries.",
            inputSchema: z.object({
                type: z
                    .enum(["MEMORY", "DECISION", "TASK", "NOTE"])
                    .describe("MEMORY = fact to remember | DECISION = choice made | TASK = thing to do | NOTE = general note"),
                content: z.string().min(1).describe("Entry content"),
                tags: z
                    .array(z.string())
                    .default([])
                    .describe('Optional tags for retrieval, e.g. ["auth","backend"]'),
                actorType: z.enum(["USER", "AGENT", "SYSTEM"]).default("AGENT"),
                actorId: z.string().optional().describe("Agent or user ID, defaults to calling userId"),
            }),
        },
        async ({ type, content, tags }: { type: string; content: string; tags: string[] }) => {
            const user = await db.select().from(users).where(eq(users.id, userId)).get();
            const date = getLocalDate(user?.timezone);

            const session = await resolveOrCreateSession(db, userId, date);

            const now = new Date().toISOString();
            const entry = {
                id: globalThis.crypto.randomUUID(),
                sessionId: session.id,
                userId,
                type,
                content,
                tags: JSON.stringify(tags),
                createdAt: now,
            };

            await db.insert(sessionEntries).values(entry);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ ...entry, tags }, null, 2),
                    },
                ],
            };
        }
    );

    // ── get_session ────────────────────────────────────────────────────────────
    server.registerTool(
        "get_session",
        {
            description:
                "Get a session for a specific date including all entries in chronological order. Defaults to today.",
            inputSchema: z.object({
                date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/)
                    .optional()
                    .describe("Date in YYYY-MM-DD format. Defaults to today."),
            }),
        },
        async ({ date }: { date?: string }) => {
            const user = await db.select().from(users).where(eq(users.id, userId)).get();
            const targetDate = date ?? getLocalDate(user?.timezone);

            const session = await db
                .select()
                .from(sessions)
                .where(and(eq(sessions.userId, userId), eq(sessions.date, targetDate)))
                .get();

            if (!session) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ session: null, entries: [] }) }],
                };
            }

            const entries = await db
                .select()
                .from(sessionEntries)
                .where(
                    and(
                        eq(sessionEntries.userId, userId),
                        eq(sessionEntries.sessionId, session.id)
                    )
                )
                .orderBy(sessionEntries.createdAt)
                .all();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(
                            {
                                session,
                                entries: entries.map((e: any) => ({ ...e, tags: JSON.parse(e.tags) })),
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        }
    );

    // ── get_session_entries ────────────────────────────────────────────────────
    server.registerTool(
        "get_session_entries",
        {
            description:
                "Get the most recent session entries across all sessions, newest first. Useful for a quick catch-up on what happened.",
            inputSchema: z.object({
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(100)
                    .default(20)
                    .describe("Number of entries to return"),
                type: z
                    .enum(["MEMORY", "DECISION", "TASK", "NOTE"])
                    .optional()
                    .describe("Filter by entry type"),
                tag: z.string().optional().describe("Filter by a single tag"),
            }),
        },
        async ({ limit, type, tag }: { limit: number; type?: string; tag?: string }) => {
            let query = db
                .select()
                .from(sessionEntries)
                .where(eq(sessionEntries.userId, userId))
                .orderBy(desc(sessionEntries.createdAt))
                .limit(limit);

            const rows = await query.all();

            let filtered = rows.map((e: any) => ({ ...e, tags: JSON.parse(e.tags) }));

            // D1 doesn't support JSON_EACH easily, filter in JS
            if (type) filtered = filtered.filter((e: any) => e.type === type);
            if (tag) filtered = filtered.filter((e: any) => e.tags.includes(tag));

            return {
                content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
            };
        }
    );

    // ── get_sessions (last N days, kept for backwards compat) ─────────────────
    server.registerTool(
        "get_sessions",
        {
            description:
                "Get sessions with all their entries for the last N days (most recent first).",
            inputSchema: z.object({
                n: z
                    .number()
                    .int()
                    .min(1)
                    .max(365)
                    .default(7)
                    .describe("Number of past days"),
            }),
        },
        async ({ n }: { n: number }) => {
            const dates = Array.from({ length: n }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split("T")[0];
            });

            const sessionRows = await db
                .select()
                .from(sessions)
                .where(and(eq(sessions.userId, userId), inArray(sessions.date, dates)))
                .all();

            if (sessionRows.length === 0) {
                return { content: [{ type: "text", text: JSON.stringify([]) }] };
            }

            const sessionIds = sessionRows.map((s: any) => s.id);

            const entryRows = await db
                .select()
                .from(sessionEntries)
                .where(
                    and(
                        eq(sessionEntries.userId, userId),
                        inArray(sessionEntries.sessionId, sessionIds)
                    )
                )
                .orderBy(sessionEntries.createdAt)
                .all();

            const entryMap: Record<string, any[]> = {};
            for (const e of entryRows) {
                (entryMap[e.sessionId] ??= []).push({ ...e, tags: JSON.parse(e.tags) });
            }

            const result = sessionRows.map((s: any) => ({
                ...s,
                entries: entryMap[s.id] ?? [],
            }));

            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );
}