/*
  # Storage bucket setup and policies

  1. Changes
    - Create storage bucket "Sumiland Design"
    - Set up RLS policies for the bucket
      - Allow authenticated users to upload files
      - Allow authenticated users to delete their files
      - Allow public access to view files
*/

-- Create the storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('Sumiland Design', 'Sumiland Design', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS on objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the storage.objects table
DO $$ 
BEGIN
  -- Policy for public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public can view images'
  ) THEN
    CREATE POLICY "Public can view images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'Sumiland Design');
  END IF;

  -- Policy for authenticated users to upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can upload images'
  ) THEN
    CREATE POLICY "Authenticated users can upload images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'Sumiland Design');
  END IF;

  -- Policy for authenticated users to update their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can update their images'
  ) THEN
    CREATE POLICY "Authenticated users can update their images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'Sumiland Design')
      WITH CHECK (bucket_id = 'Sumiland Design');
  END IF;

  -- Policy for authenticated users to delete their images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can delete their images'
  ) THEN
    CREATE POLICY "Authenticated users can delete their images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'Sumiland Design');
  END IF;
END $$;