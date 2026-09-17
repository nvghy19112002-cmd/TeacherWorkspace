use rusqlite::{params, params_from_iter, types::{Value, ValueRef}, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value as Json};
use std::{collections::BTreeMap, path::Path, sync::Mutex};

pub struct DatabaseState(pub Mutex<Result<Connection, String>>);
const TABLES: &[(&str, &[&str])] = &[
    ("workspaces", &["id", "name", "description", "created_at", "archived"]),
    ("work_items", &["id", "workspace_id", "title", "description", "category", "location", "color", "created_at", "updated_at", "archived"]),
    ("schedule_rules", &["id", "series_id", "work_item_id", "weekdays", "start_time", "end_time", "start_date", "end_date", "anchor_date", "recurrence_type", "interval_weeks", "active"]),
    ("schedule_exceptions", &["id", "rule_id", "original_date", "kind", "target_date", "start_time", "end_time", "status", "note", "deleted"]),
    ("settings", &["id", "value"]),
];
const BANK_TABLES: &[(&str, &[&str])] = &[
    ("curriculum_nodes", &["id", "parent_id", "kind", "code", "name", "description", "sort_order", "archived", "created_at", "updated_at"]),
    ("learning_outcomes", &["id", "node_id", "code", "content", "source", "active", "created_at", "updated_at"]),
    ("questions", &["id", "display_id", "classification_code", "sequence_number", "raw_source", "normalized_source", "content_hash", "question_type", "answer", "solution", "level", "grade_node_id", "domain_node_id", "chapter_node_id", "lesson_node_id", "form_node_id", "primary_outcome_id", "secondary_outcome_ids", "tags", "source", "status", "confidence", "reasoning", "warnings", "has_image", "usage_count", "id_locked", "created_at", "updated_at", "deleted_at"]),
    ("question_revisions", &["id", "question_id", "snapshot", "reason", "created_at"]),
    ("classification_runs", &["id", "question_id", "provider", "model", "result_json", "accepted", "created_at"]),
    ("exams", &["id", "title", "grade_node_id", "duration_minutes", "exam_date", "status", "seed", "created_at", "updated_at"]),
    ("exam_items", &["id", "exam_id", "section_id", "question_id", "question_snapshot", "sort_order", "points", "locked"]),
];
const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../../src/database/migrations/001_initial.sql")),
    (2, include_str!("../../src/database/migrations/002_question_bank.sql")),
];

pub fn open(path: &Path) -> Result<Connection, String> {
    let mut db = Connection::open(path).map_err(|e| e.to_string())?;
    db.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;").map_err(|e| e.to_string())?;
    let version: i64 = db.query_row("PRAGMA user_version", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if version > MIGRATIONS.last().map(|m|m.0).unwrap_or(0) { return Err("Database is newer than this application; update Teacher Workspace.".into()); }
    // Before upgrading a shipped schema, preserve a consistent WAL-inclusive snapshot.
    if version > 0 && version < MIGRATIONS.last().map(|m|m.0).unwrap_or(0) {
        let dir = path.parent().ok_or("Database parent missing")?.join("backups");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
        let backup = dir.join(format!("before-migration-v{}-{}.sqlite3", version, stamp));
        db.execute("VACUUM INTO ?1", [backup.to_string_lossy().as_ref()]).map_err(|e|e.to_string())?;
    }
    for (number, sql) in MIGRATIONS {
        if *number > version {
            let tx = db.transaction().map_err(|e| e.to_string())?;
            tx.execute_batch(sql).map_err(|e| e.to_string())?;
            tx.pragma_update(None, "user_version", number).map_err(|e| e.to_string())?;
            tx.commit().map_err(|e| e.to_string())?;
        }
    }
    let integrity: String = db.query_row("PRAGMA quick_check", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if integrity != "ok" { return Err(format!("Database integrity error: {}", integrity)); }
    Ok(db)
}
#[derive(Serialize)]
pub struct DbSnapshot { revision: i64, tables: BTreeMap<String, Vec<Json>> }
#[derive(Deserialize)]
pub struct Mutation { table: String, id: String, row: Option<Map<String, Json>> }
fn read_selected(db: &Connection, selected: &[(&str, &[&str])], revision_sql: &str) -> Result<DbSnapshot, String> {
    let revision = db.query_row(revision_sql, [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let mut tables = BTreeMap::new();
    for (table, _) in selected {
        let mut statement = db.prepare(&format!("SELECT * FROM {}", table)).map_err(|e| e.to_string())?;
        let columns: Vec<String> = statement.column_names().iter().map(|s| s.to_string()).collect();
        let result = statement.query_map([], |row| {
            let mut object = Map::new();
            for (i, name) in columns.iter().enumerate() {
                let value = match row.get_ref(i)? {
                    ValueRef::Null => Json::Null,
                    ValueRef::Integer(n) => Json::from(n),
                    ValueRef::Real(n) => Json::from(n),
                    ValueRef::Text(s) => Json::String(String::from_utf8_lossy(s).to_string()),
                    ValueRef::Blob(_) => return Err(rusqlite::Error::InvalidColumnType(i, name.clone(), rusqlite::types::Type::Blob)),
                };
                object.insert(name.clone(), value);
            }
            Ok(Json::Object(object))
        }).map_err(|e| e.to_string())?;
        let rows: Result<Vec<_>, _> = result.collect();
        tables.insert(table.to_string(), rows.map_err(|e| e.to_string())?);
    }
    Ok(DbSnapshot { revision, tables })
}
fn read(db: &Connection) -> Result<DbSnapshot, String> {
    read_selected(db, TABLES, "SELECT revision FROM app_meta WHERE id=1")
}
fn read_bank(db: &Connection) -> Result<DbSnapshot, String> {
    read_selected(db, BANK_TABLES, "SELECT revision FROM question_bank_meta WHERE id=1")
}
fn commit_selected(db: &mut Connection, mutations: Vec<Mutation>, expected: i64, selected: &[(&str, &[&str])], meta_table: &str) -> Result<i64, String> {
    if mutations.len() > 400000 { return Err("Too many changes in one transaction".into()); }
    let tx = db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(|e| e.to_string())?;
    let revision_sql = format!("SELECT revision FROM {} WHERE id=1", meta_table);
    let revision: i64 = tx.query_row(&revision_sql, [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if revision != expected { return Err("Dữ liệu đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi tiếp tục.".into()); }
    tx.execute_batch("PRAGMA defer_foreign_keys=ON").map_err(|e| e.to_string())?;
    for mutation in mutations {
        let (_, allowed) = selected.iter().find(|(table, _)| *table == mutation.table).ok_or("Unsupported table")?;
        if let Some(row) = mutation.row {
            if row.len() != allowed.len() || row.keys().any(|key| !allowed.contains(&key.as_str())) || row.get("id").and_then(Json::as_str) != Some(mutation.id.as_str()) {
                return Err("Invalid database columns or id".into());
            }
            let columns: Vec<&str> = row.keys().map(String::as_str).collect();
            let parameters: Result<Vec<Value>, String> = row.values().map(|value| match value {
                Json::Null => Ok(Value::Null),
                Json::String(text) => Ok(Value::Text(text.clone())),
                Json::Number(number) => number.as_i64().map(Value::Integer).ok_or_else(|| "Only integer database numbers are supported".to_string()),
                _ => Err("Unsupported database value".to_string()),
            }).collect();
            let updates = columns.iter().filter(|key| **key != "id").map(|key| format!("{}=excluded.{}", key, key)).collect::<Vec<_>>().join(",");
            let sql = format!("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}", mutation.table, columns.join(","), vec!["?"; columns.len()].join(","), updates);
            tx.execute(&sql, params_from_iter(parameters?)).map_err(|e| e.to_string())?;
        } else {
            tx.execute(&format!("DELETE FROM {} WHERE id=?", mutation.table), params![mutation.id]).map_err(|e| e.to_string())?;
        }
    }
    tx.execute(&format!("UPDATE {} SET revision=revision+1 WHERE id=1", meta_table), []).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(revision + 1)
}
fn commit(db: &mut Connection, mutations: Vec<Mutation>, expected: i64) -> Result<i64, String> {
    if mutations.len() > 400000 { return Err("Too many changes in one transaction".into()); }
    let tx = db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
    let revision: i64 = tx.query_row("SELECT revision FROM app_meta WHERE id=1", [], |r|r.get(0)).map_err(|e|e.to_string())?;
    if revision != expected { return Err("Dữ liệu đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi tiếp tục.".into()); }
    tx.execute_batch("PRAGMA defer_foreign_keys=ON").map_err(|e|e.to_string())?;
    for m in &mutations {
        if m.table == "schedule_exceptions" && m.row.is_some() { tx.execute("DELETE FROM schedule_exceptions WHERE id=?", params![m.id]).map_err(|e|e.to_string())?; }
    }
    for m in mutations {
        let (_, allowed) = TABLES.iter().find(|(t,_)|*t == m.table).ok_or("Unsupported table")?;
        if let Some(row) = m.row {
            if row.len() != allowed.len() || row.keys().any(|k|!allowed.contains(&k.as_str())) || row.get("id").and_then(Json::as_str) != Some(m.id.as_str()) { return Err("Invalid database columns or id".into()); }
            let columns: Vec<&str> = row.keys().map(String::as_str).collect();
            let parameters: Result<Vec<Value>, String> = row.values().map(|v|match v {
                Json::Null => Ok(Value::Null),
                Json::String(s) => Ok(Value::Text(s.clone())),
                Json::Number(n) => n.as_i64().map(Value::Integer).ok_or_else(||"Only integer database numbers are supported".to_string()),
                _ => Err("Unsupported database value".to_string()),
            }).collect();
            let updates = columns.iter().filter(|k|**k != "id").map(|k|format!("{}=excluded.{}",k,k)).collect::<Vec<_>>().join(",");
            let sql = format!("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}", m.table, columns.join(","), vec!["?";columns.len()].join(","), updates);
            tx.execute(&sql, params_from_iter(parameters?)).map_err(|e|e.to_string())?;
        } else { tx.execute(&format!("DELETE FROM {} WHERE id=?",m.table),params![m.id]).map_err(|e|e.to_string())?; }
    }
    tx.execute("UPDATE app_meta SET revision=revision+1 WHERE id=1",[]).map_err(|e|e.to_string())?;
    tx.commit().map_err(|e|e.to_string())?;
    Ok(revision+1)
}
#[tauri::command]
pub fn load_database(state: tauri::State<'_, DatabaseState>) -> Result<DbSnapshot, String> {
    let guard = state.0.lock().map_err(|_|"Database lock failed")?;
    read(guard.as_ref().map_err(Clone::clone)?)
}
#[tauri::command]
pub fn commit_database(state: tauri::State<'_, DatabaseState>, mutations: Vec<Mutation>, expected_revision: i64) -> Result<i64, String> {
    let mut guard = state.0.lock().map_err(|_|"Database lock failed")?;
    commit(guard.as_mut().map_err(|e|e.clone())?, mutations, expected_revision)
}
#[tauri::command]
pub fn load_question_bank(state: tauri::State<'_, DatabaseState>) -> Result<DbSnapshot, String> {
    let guard = state.0.lock().map_err(|_| "Database lock failed")?;
    read_bank(guard.as_ref().map_err(Clone::clone)?)
}
#[tauri::command]
pub fn commit_question_bank(state: tauri::State<'_, DatabaseState>, mutations: Vec<Mutation>, expected_revision: i64) -> Result<i64, String> {
    let mut guard = state.0.lock().map_err(|_| "Database lock failed")?;
    commit_selected(guard.as_mut().map_err(|error| error.clone())?, mutations, expected_revision, BANK_TABLES, "question_bank_meta")
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migration_and_revision_guard() {
        let mut db = open(Path::new(":memory:")).unwrap();
        assert_eq!(read(&db).unwrap().revision,0);
        assert_eq!(commit(&mut db,vec![],0).unwrap(),1);
        assert!(commit(&mut db,vec![],0).is_err());
        assert_eq!(read(&db).unwrap().revision,1);
    }
    #[test]
    fn invalid_mutation_rolls_back() {
        let mut db = open(Path::new(":memory:")).unwrap();
        assert!(commit(&mut db,vec![Mutation {table:"arbitrary".into(),id:"a".into(),row:None}],0).is_err());
        assert_eq!(read(&db).unwrap().revision,0);
    }
}
