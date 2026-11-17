CREATE TABLE "installment_plans" (
	"months" integer PRIMARY KEY NOT NULL,
	"markup" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "installment_months" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "installment_monthly" bigint;