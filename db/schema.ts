import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

// One certificate PDF (and optional JPEG preview) per participant of a verification record.
// File bytes live in the CERTIFICATES KV namespace under certificates/<slug>/<name_key>/<version>.<pdf|jpg>.
export const certificateFiles = sqliteTable("certificate_files", {
  slug: text("slug").notNull(),
  nameKey: text("name_key").notNull(),
  displayName: text("display_name").notNull(),
  originalName: text("original_name"),
  pdfSize: integer("pdf_size").notNull(),
  hasPreview: integer("has_preview").notNull().default(0),
  version: text("version").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.slug, table.nameKey] })]);

// Settings for certificates generated from public/certificate/template.pdf (JSON, see app/certificates/settings.ts).
export const certificateSettings = sqliteTable("certificate_settings", {
  slug: text("slug").primaryKey(),
  settingsJson: text("settings_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
