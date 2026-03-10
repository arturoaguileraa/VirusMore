CREATE TABLE "ai_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_docs_analysis_id_unique" UNIQUE("analysis_id")
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"raw_data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"analysis_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_hits" (
	"analysis_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"hit_count" integer DEFAULT 1 NOT NULL,
	"last_hit" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_docs" ADD CONSTRAINT "ai_docs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_docs_analysis_complete" ON "ai_docs" USING btree ("analysis_id","is_complete");--> statement-breakpoint
CREATE INDEX "idx_analyses_type" ON "analyses" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_chat_session" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_analysis" ON "chat_messages" USING btree ("analysis_id");