PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  type TEXT NOT NULL CHECK (type IN ('department', 'scenario', 'task')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  access_scope TEXT NOT NULL DEFAULT 'public' CHECK (access_scope IN ('public', 'admin', 'hidden')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON categories(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_public_sort ON categories(is_active, access_scope, level, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_parent_slug ON categories(COALESCE(parent_id, ''), slug);

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES categories(id),
  scenario_id TEXT NOT NULL REFERENCES categories(id),
  task_id TEXT NOT NULL REFERENCES categories(id),
  access TEXT NOT NULL DEFAULT 'free' CHECK (access IN ('free', 'pro', 'pack', 'paid', 'hidden')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'archived', 'needs_classification')),
  featured INTEGER NOT NULL DEFAULT 0,
  model TEXT DEFAULT '',
  modality TEXT DEFAULT '',
  tool TEXT DEFAULT '',
  output_type TEXT DEFAULT '',
  language TEXT DEFAULT 'zh-CN',
  summary TEXT DEFAULT '',
  prompt_zh TEXT DEFAULT '',
  prompt_en TEXT DEFAULT '',
  prompt_model_specific TEXT DEFAULT '{}',
  negative_prompt TEXT DEFAULT '',
  variables_json TEXT DEFAULT '[]',
  output_format TEXT DEFAULT '',
  use_case TEXT DEFAULT '',
  expected_result TEXT DEFAULT '',
  usage_tips TEXT DEFAULT '',
  quality_score INTEGER NOT NULL DEFAULT 60,
  quality_level TEXT NOT NULL DEFAULT 'basic' CHECK (quality_level IN ('basic', 'usable', 'professional')),
  copy_ready INTEGER NOT NULL DEFAULT 0,
  missing_fields_json TEXT DEFAULT '[]',
  seo_keywords_json TEXT DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  pack_id TEXT DEFAULT '',
  source_type TEXT DEFAULT '',
  original_category TEXT DEFAULT '',
  search_text TEXT DEFAULT '',
  original_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_prompts_public ON prompts(access, status, copy_ready, featured, quality_level, quality_score);
CREATE INDEX IF NOT EXISTS idx_prompts_department ON prompts(department_id, scenario_id, task_id, status, access);
CREATE INDEX IF NOT EXISTS idx_prompts_task_sort ON prompts(task_id, featured, quality_score DESC, sort_order);
CREATE INDEX IF NOT EXISTS idx_prompts_search_text ON prompts(search_text);
CREATE INDEX IF NOT EXISTS idx_prompts_pack ON prompts(pack_id, access, status);
CREATE INDEX IF NOT EXISTS idx_prompts_updated ON prompts(updated_at DESC);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  changed_by TEXT DEFAULT 'admin',
  change_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id, version DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  detail_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS prompt_assets (
  id TEXT PRIMARY KEY,
  prompt_id TEXT DEFAULT '' REFERENCES prompts(id) ON DELETE SET DEFAULT,
  r2_key TEXT NOT NULL,
  public_url TEXT DEFAULT '',
  title TEXT DEFAULT '',
  mime_type TEXT DEFAULT '',
  size_bytes INTEGER DEFAULT 0,
  detail_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_assets_prompt ON prompt_assets(prompt_id, created_at DESC);
