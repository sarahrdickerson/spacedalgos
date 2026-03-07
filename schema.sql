


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."pace_preset" AS ENUM (
    'leisurely',
    'normal',
    'accelerated',
    'custom'
);


ALTER TYPE "public"."pace_preset" OWNER TO "postgres";


CREATE TYPE "public"."time_bucket_enum" AS ENUM (
    '0-15',
    '15-30',
    '30-60',
    '60+'
);


ALTER TYPE "public"."time_bucket_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_daily_activity"("p_user_id" "uuid", "p_activity_date" "date", "p_was_due" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_problems_reviewed INT;
  v_problems_due_completed INT;
BEGIN
  -- Count distinct problems attempted on this date
  SELECT COUNT(DISTINCT problem_id)
  INTO v_problems_reviewed
  FROM user_problem_attempts
  WHERE user_id = p_user_id
    AND DATE(attempted_at) = p_activity_date;

  -- Count problems that were due and completed (if we can determine)
  -- For simplicity, increment if p_was_due is true
  v_problems_due_completed := CASE WHEN p_was_due THEN 1 ELSE 0 END;

  -- Upsert the daily activity record
  INSERT INTO user_daily_activity (
    user_id,
    activity_date,
    problems_reviewed,
    problems_due_completed,
    updated_at
  )
  VALUES (
    p_user_id,
    p_activity_date,
    v_problems_reviewed,
    v_problems_due_completed,
    NOW()
  )
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    problems_reviewed = v_problems_reviewed,
    problems_due_completed = CASE 
      WHEN p_was_due THEN user_daily_activity.problems_due_completed + 1
      ELSE user_daily_activity.problems_due_completed
    END,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."upsert_daily_activity"("p_user_id" "uuid", "p_activity_date" "date", "p_was_due" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problem_list_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid" NOT NULL,
    "problem_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "list_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."problem_list_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problem_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "source" "text",
    "version" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."problem_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "category" "text" NOT NULL,
    "leetcode_slug" "text" NOT NULL,
    "leetcode_url" "text" NOT NULL,
    "is_premium" boolean DEFAULT false NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "problems_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['Easy'::"text", 'Medium'::"text", 'Hard'::"text"])))
);


ALTER TABLE "public"."problems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_daily_activity" (
    "user_id" "uuid" NOT NULL,
    "activity_date" "date" NOT NULL,
    "problems_reviewed" integer DEFAULT 0,
    "problems_due_completed" integer DEFAULT 0,
    "total_problems_due" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_daily_activity" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_daily_activity" IS 'Daily aggregation of user problem-solving activity for streak tracking and analytics';



COMMENT ON COLUMN "public"."user_daily_activity"."problems_reviewed" IS 'Count of distinct problems attempted on this date';



COMMENT ON COLUMN "public"."user_daily_activity"."problems_due_completed" IS 'Count of problems that were due and completed on this date';



COMMENT ON COLUMN "public"."user_daily_activity"."total_problems_due" IS 'Total number of problems that were due on this date';



CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "active_list_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date"
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_preferences"."current_streak" IS 'Current consecutive days streak';



COMMENT ON COLUMN "public"."user_preferences"."longest_streak" IS 'Longest consecutive days streak achieved';



COMMENT ON COLUMN "public"."user_preferences"."last_activity_date" IS 'Date of last problem-solving activity';



CREATE TABLE IF NOT EXISTS "public"."user_problem_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "problem_id" "uuid" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "grade" smallint NOT NULL,
    "time_bucket" "public"."time_bucket_enum",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stage" smallint,
    CONSTRAINT "user_problem_attempts_grade_check" CHECK ((("grade" >= 0) AND ("grade" <= 2)))
);


ALTER TABLE "public"."user_problem_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_problem_progress" (
    "user_id" "uuid" NOT NULL,
    "problem_id" "uuid" NOT NULL,
    "stage" smallint DEFAULT 1 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "next_review_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "fail_count" integer DEFAULT 0 NOT NULL,
    "interval_days" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "user_problem_progress_stage_check" CHECK ((("stage" >= 1) AND ("stage" <= 3)))
);


ALTER TABLE "public"."user_problem_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_study_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "list_id" "uuid" NOT NULL,
    "pace" "public"."pace_preset" DEFAULT 'normal'::"public"."pace_preset" NOT NULL,
    "new_per_day" integer DEFAULT 2 NOT NULL,
    "review_per_day" integer DEFAULT 4 NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "target_end_date" "date",
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_study_plans" OWNER TO "postgres";


ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problem_list_items"
    ADD CONSTRAINT "problem_list_items_list_id_order_index_key" UNIQUE ("list_id", "order_index");



ALTER TABLE ONLY "public"."problem_list_items"
    ADD CONSTRAINT "problem_list_items_list_id_problem_id_key" UNIQUE ("list_id", "problem_id");



ALTER TABLE ONLY "public"."problem_list_items"
    ADD CONSTRAINT "problem_list_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problem_lists"
    ADD CONSTRAINT "problem_lists_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."problem_lists"
    ADD CONSTRAINT "problem_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_leetcode_slug_key" UNIQUE ("leetcode_slug");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_daily_activity"
    ADD CONSTRAINT "user_daily_activity_pkey" PRIMARY KEY ("user_id", "activity_date");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_problem_attempts"
    ADD CONSTRAINT "user_problem_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_problem_progress"
    ADD CONSTRAINT "user_problem_progress_pkey" PRIMARY KEY ("user_id", "problem_id");



ALTER TABLE ONLY "public"."user_problem_progress"
    ADD CONSTRAINT "user_problem_progress_unique" UNIQUE ("user_id", "problem_id");



ALTER TABLE ONLY "public"."user_study_plans"
    ADD CONSTRAINT "user_study_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_study_plans"
    ADD CONSTRAINT "user_study_plans_user_id_list_id_key" UNIQUE ("user_id", "list_id");



CREATE INDEX "idx_attempts_user_problem_time" ON "public"."user_problem_attempts" USING "btree" ("user_id", "problem_id", "attempted_at" DESC);



CREATE INDEX "idx_list_items_list_order" ON "public"."problem_list_items" USING "btree" ("list_id", "order_index");



CREATE INDEX "idx_problems_category" ON "public"."problems" USING "btree" ("category");



CREATE INDEX "idx_problems_difficulty" ON "public"."problems" USING "btree" ("difficulty");



CREATE INDEX "idx_user_daily_activity_user_date" ON "public"."user_daily_activity" USING "btree" ("user_id", "activity_date" DESC);



CREATE INDEX "idx_user_progress_next_review" ON "public"."user_problem_progress" USING "btree" ("user_id", "next_review_at");



CREATE INDEX "idx_user_study_plans_active" ON "public"."user_study_plans" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "email_when_feedback" AFTER INSERT ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://anqqseenmlselzihvqeu.supabase.co/functions/v1/email_when_feedback_submitted', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucXFzZWVubWxzZWx6aWh2cWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3MTkxMiwiZXhwIjoyMDg3NTQ3OTEyfQ.CGPHUruiH2h6ntt6YBq4bKoNRYa1uiE1KTctlyBeuoY"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "trg_user_study_plans_updated_at" BEFORE UPDATE ON "public"."user_study_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."problem_list_items"
    ADD CONSTRAINT "problem_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."problem_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."problem_list_items"
    ADD CONSTRAINT "problem_list_items_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_daily_activity"
    ADD CONSTRAINT "user_daily_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_active_list_id_fkey" FOREIGN KEY ("active_list_id") REFERENCES "public"."problem_lists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_problem_attempts"
    ADD CONSTRAINT "user_problem_attempts_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_problem_attempts"
    ADD CONSTRAINT "user_problem_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_problem_progress"
    ADD CONSTRAINT "user_problem_progress_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_problem_progress"
    ADD CONSTRAINT "user_problem_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_study_plans"
    ADD CONSTRAINT "user_study_plans_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."problem_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_study_plans"
    ADD CONSTRAINT "user_study_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for users based on user_id" ON "public"."user_problem_attempts" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."user_problem_progress" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."user_daily_activity" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."user_problem_attempts" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."user_problem_progress" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."problem_list_items" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."problem_lists" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."problems" FOR SELECT USING (true);



CREATE POLICY "Enable users to view their own data only" ON "public"."user_daily_activity" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."user_problem_attempts" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."user_problem_progress" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own study plans" ON "public"."user_study_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own daily activity" ON "public"."user_daily_activity" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own feedback" ON "public"."feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own study plans" ON "public"."user_study_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own study plans" ON "public"."user_study_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own study plans" ON "public"."user_study_plans" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own daily activity" ON "public"."user_daily_activity" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."problem_list_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."problem_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."problems" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update own progress" ON "public"."user_problem_progress" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_daily_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_problem_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_problem_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_study_plans" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_daily_activity"("p_user_id" "uuid", "p_activity_date" "date", "p_was_due" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_daily_activity"("p_user_id" "uuid", "p_activity_date" "date", "p_was_due" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_daily_activity"("p_user_id" "uuid", "p_activity_date" "date", "p_was_due" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."problem_list_items" TO "anon";
GRANT ALL ON TABLE "public"."problem_list_items" TO "authenticated";
GRANT ALL ON TABLE "public"."problem_list_items" TO "service_role";



GRANT ALL ON TABLE "public"."problem_lists" TO "anon";
GRANT ALL ON TABLE "public"."problem_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."problem_lists" TO "service_role";



GRANT ALL ON TABLE "public"."problems" TO "anon";
GRANT ALL ON TABLE "public"."problems" TO "authenticated";
GRANT ALL ON TABLE "public"."problems" TO "service_role";



GRANT ALL ON TABLE "public"."user_daily_activity" TO "anon";
GRANT ALL ON TABLE "public"."user_daily_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."user_daily_activity" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_problem_attempts" TO "anon";
GRANT ALL ON TABLE "public"."user_problem_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_problem_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."user_problem_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_problem_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_problem_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_study_plans" TO "anon";
GRANT ALL ON TABLE "public"."user_study_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."user_study_plans" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







