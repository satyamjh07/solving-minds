-- SQL migration to upgrade the progression system to the event-based Atoms system.
-- Run this in your Supabase SQL Editor.

-- 1. Create the atom_transactions table
CREATE TABLE IF NOT EXISTS public.atom_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    atoms INTEGER NOT NULL,
    season TEXT NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS) on atom_transactions
ALTER TABLE public.atom_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for atom_transactions
CREATE POLICY "Users can view their own atom transactions"
    ON public.atom_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own atom transactions"
    ON public.atom_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Add streak and lifetime_atoms columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifetime_atoms NUMERIC DEFAULT 0;

-- 3. Create indexes to optimize queries
CREATE INDEX IF NOT EXISTS idx_atom_transactions_user_id ON public.atom_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_atom_transactions_user_season ON public.atom_transactions(user_id, season);

-- 4. Enable Question Reporting by adding question_id column to reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_reports_question_id ON public.reports(question_id);

-- 5. Update check constraint to allow either post_id or question_id to be populated
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS report_target;
ALTER TABLE public.reports ADD CONSTRAINT report_target CHECK (post_id IS NOT NULL OR question_id IS NOT NULL);
