/*
  # Add Attachment URL Column to Cases

  1. Changes
    - Add attachment_url column to cases table to store uploaded file URLs

  2. Details
    - Nullable column for optional attachments
    - Stores public URL of uploaded file from Supabase storage
*/

-- Add attachment_url column to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS attachment_url text;