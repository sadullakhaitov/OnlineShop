CREATE TABLE "promo_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" bigint NOT NULL,
	"min_total" bigint DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" bigint DEFAULT 0 NOT NULL;