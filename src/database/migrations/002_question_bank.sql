CREATE TABLE IF NOT EXISTS question_bank_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
INSERT OR IGNORE INTO question_bank_meta(id, revision) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS curriculum_nodes (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('grade','domain','chapter','lesson','form')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(parent_id, kind, code)
);
CREATE INDEX IF NOT EXISTS idx_curriculum_parent ON curriculum_nodes(parent_id, sort_order);

CREATE TABLE IF NOT EXISTS learning_outcomes (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Chương trình GDPT 2018',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outcome_node ON learning_outcomes(node_id);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  display_id TEXT UNIQUE,
  classification_code TEXT NOT NULL DEFAULT '',
  sequence_number INTEGER CHECK (sequence_number IS NULL OR sequence_number > 0),
  raw_source TEXT NOT NULL,
  normalized_source TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice','true_false','short_answer','essay','multi_part')),
  answer TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL CHECK (level IN ('N','H','V','C')),
  grade_node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  domain_node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  chapter_node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  lesson_node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  form_node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  primary_outcome_id TEXT REFERENCES learning_outcomes(id) ON DELETE RESTRICT,
  secondary_outcome_ids TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft','review','approved','needs_fix','archived')),
  confidence INTEGER CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  reasoning TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '[]',
  has_image INTEGER NOT NULL DEFAULT 0 CHECK (has_image IN (0,1)),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  id_locked INTEGER NOT NULL DEFAULT 0 CHECK (id_locked IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_filter ON questions(grade_node_id, domain_node_id, chapter_node_id, lesson_node_id, form_node_id, level, question_type, status);
CREATE INDEX IF NOT EXISTS idx_questions_hash ON questions(content_hash);
CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at DESC);

CREATE TABLE IF NOT EXISTS question_revisions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revisions_question ON question_revisions(question_id, created_at DESC);

CREATE TABLE IF NOT EXISTS question_assets (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  checksum TEXT NOT NULL,
  missing INTEGER NOT NULL DEFAULT 0 CHECK (missing IN (0,1)),
  created_at TEXT NOT NULL,
  UNIQUE(question_id, relative_path)
);

CREATE TABLE IF NOT EXISTS question_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS question_tag_links (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES question_tags(id) ON DELETE CASCADE,
  PRIMARY KEY(question_id, tag_id)
);

CREATE TABLE IF NOT EXISTS question_outcome_links (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  outcome_id TEXT NOT NULL REFERENCES learning_outcomes(id) ON DELETE RESTRICT,
  relation TEXT NOT NULL CHECK (relation IN ('primary','secondary')),
  PRIMARY KEY(question_id, outcome_id)
);

CREATE TABLE IF NOT EXISTS classification_runs (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  result_json TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0 CHECK (accepted IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duplicate_groups (
  id TEXT PRIMARY KEY,
  question_ids TEXT NOT NULL,
  method TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  status TEXT NOT NULL CHECK (status IN ('open','keep_both','resolved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  grade_node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  exam_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','finalized','archived')),
  seed TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS exam_sections (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  UNIQUE(exam_id, sort_order)
);
CREATE TABLE IF NOT EXISTS exam_items (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES exam_sections(id) ON DELETE SET NULL,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_snapshot TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0,1)),
  UNIQUE(exam_id, sort_order)
);
CREATE INDEX IF NOT EXISTS idx_exam_items_exam ON exam_items(exam_id, sort_order);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preview','committed','failed','cancelled')),
  total_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  error_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
