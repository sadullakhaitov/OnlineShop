CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"art" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"price" bigint NOT NULL,
	"old_price" bigint,
	"rating" double precision DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"badge" text,
	"in_stock" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"color" text NOT NULL,
	"warranty" integer DEFAULT 1 NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");