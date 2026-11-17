CREATE TABLE "telegram_accounts" (
	"id" bigint PRIMARY KEY NOT NULL,
	"customer_id" uuid,
	"first_name" text,
	"username" text,
	"locale" text DEFAULT 'uz' NOT NULL,
	"reachable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_accounts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"event" text NOT NULL,
	"chat_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "telegram_id" bigint;--> statement-breakpoint
ALTER TABLE "telegram_accounts" ADD CONSTRAINT "telegram_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_messages_once_idx" ON "telegram_messages" USING btree ("order_id","audience","event");--> statement-breakpoint
CREATE INDEX "telegram_messages_pending_idx" ON "telegram_messages" USING btree ("created_at") WHERE "telegram_messages"."sent_at" is null and "telegram_messages"."failed_at" is null;