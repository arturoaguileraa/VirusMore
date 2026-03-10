import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// ─── Analyses ────────────────────────────────────────────────────────────────
// Cached VirusTotal API responses. Files use indefinite TTL (hash is immutable).
export const analyses = pgTable(
	"analyses",
	{
		id: text("id").primaryKey(), // sha256 / url-id / domain / ip
		type: text("type", { enum: ["file", "url", "domain", "ip"] }).notNull(),
		rawData: jsonb("raw_data").notNull(),
		fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at"), // null = never expires (file hashes)
	},
	(t) => [index("idx_analyses_type").on(t.type)],
);

// ─── AI Docs ─────────────────────────────────────────────────────────────────
// AI-generated markdown documentation for each analysis.
export const aiDocs = pgTable(
	"ai_docs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		analysisId: text("analysis_id")
			.references(() => analyses.id, { onDelete: "cascade" })
			.notNull()
			.unique(),
		content: text("content").notNull().default(""),
		isComplete: boolean("is_complete").notNull().default(false),
		generatedAt: timestamp("generated_at").defaultNow().notNull(),
	},
	(t) => [
		index("idx_ai_docs_analysis_complete").on(t.analysisId, t.isComplete),
	],
);

// ─── Chat Messages ────────────────────────────────────────────────────────────
// Persisted chat history per anonymous session.
export const chatMessages = pgTable(
	"chat_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sessionId: uuid("session_id").notNull(),
		analysisId: text("analysis_id")
			.references(() => analyses.id, { onDelete: "cascade" })
			.notNull(),
		role: text("role", { enum: ["user", "assistant"] }).notNull(),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("idx_chat_session").on(t.sessionId, t.createdAt),
		index("idx_chat_analysis").on(t.analysisId),
	],
);

// ─── Page Hits ────────────────────────────────────────────────────────────────
// Tracks which hashes users visit — used by future scraper priority queue.
export const pageHits = pgTable("page_hits", {
	analysisId: text("analysis_id").primaryKey(),
	type: text("type", { enum: ["file", "url", "domain", "ip"] }).notNull(),
	hitCount: integer("hit_count").notNull().default(1),
	lastHit: timestamp("last_hit").defaultNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type Analysis = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;
export type AiDoc = typeof aiDocs.$inferSelect;
export type NewAiDoc = typeof aiDocs.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type PageHit = typeof pageHits.$inferSelect;
