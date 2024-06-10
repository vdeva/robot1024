import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

export const openingPosts = pgTable("openingPost", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  lastReplyCreatedAt: timestamp("lastReplyCreatedAt", { mode: "date" })
    .defaultNow()
    .notNull(),
});

export const replies = pgTable("reply", {
  id: text("id").notNull().primaryKey(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  openingPostId: text("openingPost_id").references(() => openingPosts.id, {
    onDelete: "cascade",
  }),
});

export const repliesRelations = relations(replies, ({ one }) => ({
  openingPost: one(openingPosts, {
    fields: [replies.openingPostId],
    references: [openingPosts.id],
  }),
}));

export const openingPostsRelations = relations(openingPosts, ({ many }) => ({
  replies: many(replies),
}));
