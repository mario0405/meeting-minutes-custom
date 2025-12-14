-- Migration: Add per-meeting summary prompt/instructions
-- This stores optional user-provided context/instructions for the AI summary generation.

ALTER TABLE meetings ADD COLUMN summary_prompt TEXT;
