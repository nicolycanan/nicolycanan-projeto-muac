CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  event TEXT NOT NULL,
  path TEXT NOT NULL,

  referrer TEXT,

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  archive_slug TEXT,

  country TEXT,
  device TEXT
);

CREATE INDEX idx_analytics_events_created_at
  ON analytics_events(created_at);

CREATE INDEX idx_analytics_events_event
  ON analytics_events(event);

CREATE INDEX idx_analytics_events_path
  ON analytics_events(path);

CREATE INDEX idx_analytics_events_archive_slug
  ON analytics_events(archive_slug);

CREATE INDEX idx_analytics_events_utm_source
  ON analytics_events(utm_source);