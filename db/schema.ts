import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const verificationRecords = sqliteTable("verification_records", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  graduatesJson: text("graduates_json").notNull().default("[]"),
  note: text("note"),
  certificateUrl: text("certificate_url"),
  certificateLabel: text("certificate_label"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const adminCredentials = sqliteTable("admin_credentials", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
});
