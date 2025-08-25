-- Migration: Add recommendations table
-- This migration adds support for external recommendations for workers

CREATE TABLE IF NOT EXISTS "recommendations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "worker_user_id" uuid NOT NULL,
  "recommendation_code" varchar(50) UNIQUE NOT NULL,
  "recommendation_text" text NOT NULL,
  "relationship" text NOT NULL,
  "recommender_name" varchar(100) NOT NULL,
  "recommender_email" varchar(255) NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "moderation_status" moderation_status_enum DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_worker_user_id_users_id_fk" 
  FOREIGN KEY ("worker_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add indexes for performance
CREATE INDEX "recommendations_worker_user_id_idx" ON "recommendations" ("worker_user_id");
CREATE INDEX "recommendations_recommendation_code_idx" ON "recommendations" ("recommendation_code");
CREATE INDEX "recommendations_created_at_idx" ON "recommendations" ("created_at");

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recommendations_updated_at 
  BEFORE UPDATE ON "recommendations" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
