CREATE TABLE app_meta (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0);
INSERT INTO app_meta(id, revision) VALUES(1,0);
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  description TEXT NOT NULL, created_at TEXT NOT NULL, archived INTEGER NOT NULL CHECK(archived IN (0,1))
);
CREATE TABLE work_items (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120), description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('teaching','meeting','planning','personal')),
  location TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  archived INTEGER NOT NULL CHECK(archived IN (0,1))
);
CREATE INDEX work_items_workspace ON work_items(workspace_id);
CREATE TABLE schedule_rules (
  id TEXT PRIMARY KEY, series_id TEXT NOT NULL, work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  weekdays TEXT NOT NULL CHECK(json_valid(weekdays) AND json_array_length(weekdays) BETWEEN 1 AND 7),
  start_time TEXT NOT NULL CHECK(start_time GLOB '[0-2][0-9]:[0-5][0-9]' AND start_time <= '23:59'),
  end_time TEXT NOT NULL CHECK(end_time GLOB '[0-2][0-9]:[0-5][0-9]' AND end_time <= '23:59' AND end_time > start_time),
  start_date TEXT NOT NULL, end_date TEXT CHECK(end_date IS NULL OR end_date >= start_date), anchor_date TEXT NOT NULL,
  recurrence_type TEXT NOT NULL CHECK(recurrence_type IN ('weekly','once')),
  interval_weeks INTEGER NOT NULL CHECK(interval_weeks BETWEEN 1 AND 52), active INTEGER NOT NULL CHECK(active IN (0,1))
);
CREATE INDEX rules_item_range ON schedule_rules(work_item_id, start_date, end_date);
CREATE INDEX rules_series ON schedule_rules(series_id);
CREATE TABLE schedule_exceptions (
  id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES schedule_rules(id) ON DELETE CASCADE,
  original_date TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('override','cancelled','skipped','rescheduled','makeup')),
  target_date TEXT, start_time TEXT, end_time TEXT,
  status TEXT CHECK(status IS NULL OR status IN ('upcoming','completed','cancelled','skipped','rescheduled','makeup')),
  note TEXT NOT NULL, deleted INTEGER NOT NULL CHECK(deleted IN (0,1)),
  CHECK((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time AND start_time >= '00:00' AND end_time <= '23:59')),
  CHECK(kind NOT IN ('makeup','rescheduled') OR target_date IS NOT NULL)
);
CREATE UNIQUE INDEX one_exception_per_occurrence ON schedule_exceptions(rule_id, original_date) WHERE kind <> 'makeup';
CREATE INDEX exceptions_target ON schedule_exceptions(target_date);
CREATE TABLE settings (id TEXT PRIMARY KEY CHECK(id='app'), value TEXT NOT NULL CHECK(json_valid(value)));
