CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY,
	"space" text NOT NULL,
	"owner_id" text NOT NULL,
	"person" text NOT NULL,
	"care_date" date NOT NULL,
	"category" text NOT NULL,
	"provider" text NOT NULL,
	"cents" integer NOT NULL,
	"note" text NOT NULL,
	"receipt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_positive_cents" CHECK ("cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"scope" text PRIMARY KEY,
	"attempts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY,
	"family_hash" text,
	"space" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "expenses_space_date" ON "expenses" ("space","care_date","created_at");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_at" ON "rate_limits" ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_family_hash" ON "sessions" ("family_hash");--> statement-breakpoint
CREATE INDEX "sessions_expires_at" ON "sessions" ("expires_at");