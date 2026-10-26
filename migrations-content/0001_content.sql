PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  notion_page_id TEXT UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  dek TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '/images/carpa.png',
  tags_json TEXT NOT NULL DEFAULT '[]',
  profiles_json TEXT NOT NULL DEFAULT '[]',
  published_date TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
  demo INTEGER NOT NULL DEFAULT 0 CHECK(demo IN (0,1)),
  source_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  write_token TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS articles_publication ON articles(published,published_date DESC);
CREATE TABLE IF NOT EXISTS article_blocks (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  node_json TEXT NOT NULL,
  PRIMARY KEY(article_id,position)
);
CREATE TABLE IF NOT EXISTS article_revisions (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(article_id,revision)
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL
);
