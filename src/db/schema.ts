import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const contexts = sqliteTable("contexts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  parentId: text("parent_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const contextRelations = sqliteTable("context_relations", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  targetId: text("target_id").notNull(),
  type: text("type").notNull(), // related_to | depends_on | references | derived_from
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Drizzle Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  contexts: many(contexts),
  sessions: many(sessions),
}));

export const contextsRelations = relations(contexts, ({ one, many }) => ({
  user: one(users, { fields: [contexts.userId], references: [users.id] }),
  parent: one(contexts, { fields: [contexts.parentId], references: [contexts.id] }),
  children: many(contexts),
  outgoing: many(contextRelations, { relationName: "source" }),
  incoming: many(contextRelations, { relationName: "target" }),
}));

export const contextRelationsRelations = relations(contextRelations, ({ one }) => ({
  source: one(contexts, { fields: [contextRelations.sourceId], references: [contexts.id], relationName: "source" }),
  target: one(contexts, { fields: [contextRelations.targetId], references: [contexts.id], relationName: "target" }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));