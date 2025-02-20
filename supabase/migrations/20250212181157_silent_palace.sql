/*
  # Create Cases Table

  1. New Tables
    - `cases`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `type` (text, required)
      - `sub_type` (text)
      - `status` (text, required)
      - `contact_id` (uuid, references customers)
      - `owner_id` (uuid, references auth.users)
      - `description` (text)
      - `resume_url` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `cases` table
    - Add policies for authenticated users
*/

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('Design Inquiry', 'Career', 'Other')),
  sub_type text CHECK (
    (type = 'Design Inquiry' AND sub_type IN ('Graphic Design', 'Website Design', 'Package Design', 'Branding', 'Others'))
    OR
    (type != 'Design Inquiry' AND sub_type IS NULL)
  ),
  status text NOT NULL CHECK (status IN ('New', 'Assigned', 'In Progress', 'Completed')) DEFAULT 'New',
  contact_id uuid REFERENCES customers(customer_id),
  owner_id uuid REFERENCES auth.users(id),
  description text,
  resume_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Cases are viewable by authenticated users"
ON cases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cases can be created by anyone"
ON cases FOR INSERT
WITH CHECK (true);

CREATE POLICY "Cases can be updated by authenticated users"
ON cases FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cases_contact ON cases(contact_id);
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);
CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(type);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);