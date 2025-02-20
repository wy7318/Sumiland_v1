/*
  # CMS Schema Setup

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `title` (text)
      - `slug` (text, unique)
      - `content` (text)
      - `excerpt` (text)
      - `featured_image` (text)
      - `author_id` (uuid, references authors)
      - `published` (boolean)
      - `published_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `description` (text)
      - `created_at` (timestamptz)

    - `post_categories`
      - `post_id` (uuid, references posts)
      - `category_id` (uuid, references categories)
      - Primary key (post_id, category_id)

    - `tags`
      - `id` (uuid, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `created_at` (timestamptz)

    - `post_tags`
      - `post_id` (uuid, references posts)
      - `tag_id` (uuid, references tags)
      - Primary key (post_id, tag_id)

    - `authors`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `bio` (text)
      - `avatar_url` (text)
      - `created_at` (timestamptz)

    - `portfolio_items`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `image_url` (text)
      - `published` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage content
    - Add policies for public access to published content
*/

-- Create authors table
CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  featured_image text,
  author_id uuid REFERENCES authors(id) NOT NULL,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_categories junction table
CREATE TABLE IF NOT EXISTS post_categories (
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- Create post_tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Create portfolio_items table
CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  image_url text NOT NULL,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Create policies for authors
CREATE POLICY "Authors are viewable by everyone" ON authors
  FOR SELECT USING (true);

CREATE POLICY "Authors can be managed by authenticated users" ON authors
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for categories
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Categories can be managed by authenticated users" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for tags
CREATE POLICY "Tags are viewable by everyone" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Tags can be managed by authenticated users" ON tags
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for posts
CREATE POLICY "Published posts are viewable by everyone" ON posts
  FOR SELECT USING (published = true);

CREATE POLICY "Posts can be managed by authenticated users" ON posts
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for post_categories
CREATE POLICY "Post categories are viewable by everyone" ON post_categories
  FOR SELECT USING (true);

CREATE POLICY "Post categories can be managed by authenticated users" ON post_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for post_tags
CREATE POLICY "Post tags are viewable by everyone" ON post_tags
  FOR SELECT USING (true);

CREATE POLICY "Post tags can be managed by authenticated users" ON post_tags
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for portfolio_items
CREATE POLICY "Published portfolio items are viewable by everyone" ON portfolio_items
  FOR SELECT USING (published = true);

CREATE POLICY "Portfolio items can be managed by authenticated users" ON portfolio_items
  FOR ALL USING (auth.role() = 'authenticated');