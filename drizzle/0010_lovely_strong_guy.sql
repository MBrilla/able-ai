ALTER TYPE "public"."rtw_kyc_status_enum" ADD VALUE 'ACCEPTED' BEFORE 'REJECTED';--> statement-breakpoint
ALTER TYPE "public"."rtw_kyc_status_enum" ADD VALUE 'EXPIRED' BEFORE 'REJECTED';--> statement-breakpoint
ALTER TYPE "public"."rtw_kyc_status_enum" ADD VALUE 'NOT_FOUND' BEFORE 'REJECTED';--> statement-breakpoint
ALTER TYPE "public"."rtw_kyc_status_enum" ADD VALUE 'LOCKED' BEFORE 'REJECTED';--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_user_id" uuid NOT NULL,
	"recommendation_code" varchar(50) NOT NULL,
	"recommendation_text" text NOT NULL,
	"relationship" text NOT NULL,
	"recommender_name" varchar(100) NOT NULL,
	"recommender_email" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"moderation_status" "moderation_status_enum" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "recommendations_recommendation_code_unique" UNIQUE("recommendation_code")
);
--> statement-breakpoint
ALTER TABLE "worker_availability" ALTER COLUMN "start_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_availability" ALTER COLUMN "end_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "days" jsonb;--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "frequency" varchar(50);--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "start_date" varchar(50);--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "start_time_str" varchar(10);--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "end_time_str" varchar(10);--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "ends" varchar(50);--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "occurrences" integer;--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "end_date" varchar(50);--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_worker_user_id_users_id_fk" FOREIGN KEY ("worker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "worker_availability_user_pattern_idx" ON "worker_availability" USING btree ("user_id","frequency","start_date");