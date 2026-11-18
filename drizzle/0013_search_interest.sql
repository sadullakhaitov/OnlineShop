CREATE TABLE "search_interest" (
	"product_id" text NOT NULL,
	"day" date NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "search_interest_product_id_day_pk" PRIMARY KEY("product_id","day")
);
--> statement-breakpoint
ALTER TABLE "search_interest" ADD CONSTRAINT "search_interest_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_interest_day_idx" ON "search_interest" USING btree ("day");