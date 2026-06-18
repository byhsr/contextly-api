import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
  meta: text("meta", { mode: "json" }).$type<{
    timezone?: string;
  }>(),
});

export const contexts = sqliteTable(
  "contexts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    parentId: text("parent_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_contexts_user").on(t.userId),
    index("idx_contexts_key").on(t.key),
    index("idx_contexts_user_key").on(t.userId, t.key),
  ]
);

export const contextRelations = sqliteTable("context_relations", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  targetId: text("target_id").notNull(),
  type: text("type").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    scopeId: text("scope_id"),
    date: text("date").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_sessions_user_date").on(t.userId, t.date),
  ]
);

export const sessionEntries = sqliteTable(
  "session_entries",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id").notNull(),

    type: text("type", {
      enum: ["MEMORY", "DECISION", "TASK", "NOTE"],
    }),

    actorType: text("actor_type", {
      enum: ["USER", "AGENT", "SYSTEM"],
    }).notNull(),

    actorId: text("actor_id").notNull(),

    content: text("content").notNull(),

    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull(),

    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_entries_session").on(t.sessionId),
    index("idx_entries_user_created").on(t.userId, t.createdAt),
  ]
);

export const dumps = sqliteTable(
  "dumps",
  {
    id: text("id").primaryKey(),
    contextId: text("context_id").notNull(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_dumps_context").on(t.contextId),
    index("idx_dumps_user").on(t.userId),
    index("idx_dumps_context_created").on(t.contextId, t.createdAt),
  ]
);

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  contexts: many(contexts),
  sessions: many(sessions),
  dumps: many(dumps),
  sessionEntries: many(sessionEntries),
}));

export const contextsRelations = relations(contexts, ({ one, many }) => ({
  user: one(users, {
    fields: [contexts.userId],
    references: [users.id],
  }),
  parent: one(contexts, {
    fields: [contexts.parentId],
    references: [contexts.id],
  }),
  children: many(contexts),
  dumps: many(dumps),
  outgoing: many(contextRelations, { relationName: "source" }),
  incoming: many(contextRelations, { relationName: "target" }),
}));

export const contextRelationsRelations = relations(
  contextRelations,
  ({ one }) => ({
    source: one(contexts, {
      fields: [contextRelations.sourceId],
      references: [contexts.id],
      relationName: "source",
    }),
    target: one(contexts, {
      fields: [contextRelations.targetId],
      references: [contexts.id],
      relationName: "target",
    }),
  })
);

export const sessionsRelations = relations(
  sessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
    entries: many(sessionEntries),
  })
);

export const sessionEntriesRelations = relations(
  sessionEntries,
  ({ one }) => ({
    session: one(sessions, {
      fields: [sessionEntries.sessionId],
      references: [sessions.id],
    }),
    user: one(users, {
      fields: [sessionEntries.userId],
      references: [users.id],
    }),
  })
);

export const dumpsRelations = relations(dumps, ({ one }) => ({
  context: one(contexts, {
    fields: [dumps.contextId],
    references: [contexts.id],
  }),
  user: one(users, {
    fields: [dumps.userId],
    references: [users.id],
  }),
}));