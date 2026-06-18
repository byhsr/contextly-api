import { Context } from "hono";
import { eq, and, inArray, desc } from "drizzle-orm";
import { createDb } from "../db";
import { sessions, sessionEntries } from "../db/schema";
import { users } from "../db/schema";
import { getLocalDate } from "../lib/personalization";

// ─── helpers ─────────────────────────────────────────────────────────────────

type EntryType = "MEMORY" | "DECISION" | "TASK" | "NOTE";

async function resolveOrCreateSession(
  db: ReturnType<typeof createDb>,
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

// ─── GET /sessions ────────────────────────────────────────────────────────────
// Returns sessions + their entries for the last N days.

export async function get(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const n = Number(c.req.query("n") ?? 1);

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

  if (sessionRows.length === 0) return c.json({ ok: true, sessions: [] });

  const sessionIds = sessionRows.map((s) => s.id);

  const entryRows = await db
    .select()
    .from(sessionEntries)
    .where(and(eq(sessionEntries.userId, userId), inArray(sessionEntries.sessionId, sessionIds)))
    .orderBy(sessionEntries.createdAt)
    .all();

  const entryMap: Record<string, typeof entryRows> = {};
  for (const entry of entryRows) {
    (entryMap[entry.sessionId] ??= []).push(entry);
  }

  const result = sessionRows.map((s) => ({
    ...s,
    entries: (entryMap[s.id] ?? []).map((e) => ({
      ...e,
      tags: JSON.parse(e.tags as unknown as string),
    })),
  }));

  return c.json({ ok: true, sessions: result });
}

// ─── POST /sessions/entries ───────────────────────────────────────────────────
// Append a new entry to today's session (creates session if needed).

export async function createEntry(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const body = await c.req.json<{
    type: EntryType;
    content: string;
    tags?: string[];
    actorType?: "user" | "agent";
    actorId?: string;
  }>();

  const { type, content, tags = [], actorType = "user", actorId = userId } = body;

  if (!type || !content) {
    return c.json({ ok: false, message: "type and content are required" }, 400);
  }

  const VALID_TYPES: EntryType[] = ["MEMORY", "DECISION", "TASK", "NOTE"];
  if (!VALID_TYPES.includes(type)) {
    return c.json({ ok: false, message: `type must be one of ${VALID_TYPES.join(", ")}` }, 400);
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  const date = getLocalDate(user?.timezone);

  const session = await resolveOrCreateSession(db, userId, date);

  const now = new Date().toISOString();
  const entry = {
    id: globalThis.crypto.randomUUID(),
    sessionId: session.id,
    userId,
    actorType,
    actorId,
    type,
    content,
    tags: JSON.stringify(tags),
    createdAt: now,
  };

  await db.insert(sessionEntries).values(entry);

  return c.json({ ok: true, entry: { ...entry, tags } }, 201);
}

// ─── GET /sessions/entries ────────────────────────────────────────────────────
// Recent entries across all sessions, newest first.

export async function getEntries(c: Context) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const rows = await db
    .select()
    .from(sessionEntries)
    .where(eq(sessionEntries.userId, userId))
    .orderBy(desc(sessionEntries.createdAt))
    .limit(limit)
    .all();

  return c.json({
    ok: true,
    entries: rows.map((e) => ({ ...e, tags: JSON.parse(e.tags) })),
  });
}