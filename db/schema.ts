import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// Only encrypted GitHub App configuration is stored here; never website content.
export const editorAuth = sqliteTable("editor_auth", {
  id: text("id").primaryKey(),
  encryptedValue: text("encrypted_value").notNull(),
});
