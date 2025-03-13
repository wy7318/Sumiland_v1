/*
  # Add Email Configurations Table

  1. New Tables
    - `email_configurations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `provider` (text, email provider type)
      - `access_token` (text)
      - `refresh_token` (text, nullable)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create email_configurations table
CREATE TABLE IF NOT EXISTS email_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_email_configurations_user ON email_configurations(user_id);

-- Enable RLS
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email configurations"
  ON email_configurations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email configurations"
  ON email_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email configurations"
  ON email_configurations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email configurations"
  ON email_configurations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER set_email_configurations_timestamp
  BEFORE UPDATE ON email_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();