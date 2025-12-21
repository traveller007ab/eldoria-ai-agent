
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// --- CRITICAL SETUP: PLEASE READ ---
// If you see "Error searching memories: Failed to send a request to the Edge Function",
// it is almost certainly because you have not completed the setup in the correct order.
//
// Please follow these steps sequentially in your terminal:
//
// STEP 1: SET YOUR GEMINI API KEY SECRET
//    - This is the most important step. The AI's memory will not work without it.
//    - Run this command, replacing the key with your actual Gemini API key:
//      supabase secrets set API_KEY=your_gemini_api_key_here
//
// STEP 2: DEPLOY YOUR EDGE FUNCTIONS
//    - The functions must be deployed *after* the secret is set.
//    - If you have already deployed, you must redeploy for the secret to be available.
//    - Run: `supabase functions deploy embed --no-verify-jwt`
//    - Run: `supabase functions deploy scrape --no-verify-jwt`
//
// STEP 3: RUN THE SQL SCRIPT BELOW
//    - Go to your Supabase project dashboard -> SQL Editor -> New query.
//    - Copy the entire SQL script from the multi-line comment below and run it.
//    - This script is safe to run multiple times and is required for the app to function.

/*
-- FULL DATABASE SETUP SCRIPT (Safe to run multiple times)

-- Step 1: Enable the pgvector extension for AI memory capabilities.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Step 2: Create the main 'canvases' table with all required columns.
CREATE TABLE IF NOT EXISTS public.canvases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    content jsonb,
    output text,
    task_log jsonb,
    output_sources jsonb,
    chat_history jsonb,
    terminal_output text
);

-- Step 3: Add columns to existing 'canvases' tables for backward compatibility.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='canvases' AND column_name='task_log') THEN
        ALTER TABLE public.canvases ADD COLUMN task_log jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='canvases' AND column_name='output_sources') THEN
        ALTER TABLE public.canvases ADD COLUMN output_sources jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='canvases' AND column_name='chat_history') THEN
        ALTER TABLE public.canvases ADD COLUMN chat_history jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='canvases' AND column_name='terminal_output') THEN
        ALTER TABLE public.canvases ADD COLUMN terminal_output text;
    END IF;
END $$;


-- Step 4: Create the 'memories' table for the AI's long-term memory.
CREATE TABLE IF NOT EXISTS public.memories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    content text NOT NULL,
    embedding vector(768)
);

-- Step 5: Create the function to perform vector similarity searches.
CREATE OR REPLACE FUNCTION match_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (id uuid, content text, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, 1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Step 6: Set up Row Level Security (RLS) policies.
-- **IMPORTANT: If you cannot delete canvases, it is because these policies are missing.**
-- RLS is a security feature that blocks all database changes by default.
-- These policies explicitly grant the app permission to read, create, update, and DELETE data.
-- This is critical for the app to function correctly.

-- === Policies for the 'canvases' table ===
-- 1. Enable RLS on the table. It's safe to run this even if it's already enabled.
ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old policies that might exist from previous versions to avoid conflicts.
DROP POLICY IF EXISTS "Public canvases are viewable by everyone." ON public.canvases;
DROP POLICY IF EXISTS "Users can insert their own canvases." ON public.canvases;
DROP POLICY IF EXISTS "Users can update their own canvases." ON public.canvases;
DROP POLICY IF EXISTS "Users can delete their own canvases." ON public.canvases;
DROP POLICY IF EXISTS "Canvases are public." ON public.canvases;
DROP POLICY IF EXISTS "Public access policy" ON public.canvases;

-- 3. Create a single, permissive policy that allows all actions.
CREATE POLICY "Public access policy" ON public.canvases
  FOR ALL -- Applies to SELECT, INSERT, UPDATE, DELETE
  USING (true) -- The condition for allowing an action (true means always allow)
  WITH CHECK (true); -- The condition for allowing a row to be inserted/updated (true means always allow)

-- === Policies for the 'memories' table ===
-- 1. Enable RLS on the table.
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old policies.
DROP POLICY IF EXISTS "Memories are public." ON public.memories;
DROP POLICY IF EXISTS "Public access policy" ON public.memories;

-- 3. Create a single, permissive policy.
CREATE POLICY "Public access policy" ON public.memories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 7: Create the 'academic_projects' table for the Thesis Hub.
CREATE TABLE IF NOT EXISTS public.academic_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    format text NOT NULL DEFAULT 'RSU_MECH_ENG',
    wizard_state jsonb,
    draft_content jsonb,
    references jsonb DEFAULT '[]'::jsonb
);

-- Enable RLS for 'academic_projects'
ALTER TABLE public.academic_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access policy" ON public.academic_projects;
CREATE POLICY "Public access policy" ON public.academic_projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

*/


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key must be provided in config.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);