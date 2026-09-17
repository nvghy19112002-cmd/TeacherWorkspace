use tauri::Manager;
use crate::database::DatabaseState;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    process::Command,
};

const MIN_INSTALLER_BYTES: u64 = 1024 * 1024;
const MAX_INSTALLER_BYTES: u64 = 1024 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualUpdateInfo {
    file_name: String,
    version: String,
    current_version: String,
    size_bytes: u64,
    sha256: String,
}

fn parse_version(value: &str) -> Result<[u64; 3], String> {
    let parts = value
        .split('.')
        .map(|part| part.parse::<u64>().map_err(|_| ()))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Phiên bản trong tên file không hợp lệ.".to_string())?;
    if parts.len() != 3 {
        return Err("Phiên bản phải có dạng x.y.z.".into());
    }
    Ok([parts[0], parts[1], parts[2]])
}

fn strip_download_suffix(stem: &str) -> &str {
    if !stem.ends_with(')') {
        return stem;
    }
    let Some(start) = stem.rfind(" (") else {
        return stem;
    };
    let number = &stem[start + 2..stem.len() - 1];
    if !number.is_empty() && number.bytes().all(|byte| byte.is_ascii_digit()) {
        &stem[..start]
    } else {
        stem
    }
}

fn installer_version(file_name: &str) -> Result<String, String> {
    let stem = file_name
        .strip_suffix(".exe")
        .or_else(|| file_name.strip_suffix(".EXE"))
        .ok_or_else(|| "Chỉ chấp nhận installer Windows có đuôi .exe.".to_string())?;
    let stem = strip_download_suffix(stem);
    let version = stem
        .strip_prefix("Teacher Workspace_")
        .and_then(|value| value.strip_suffix("_x64-setup"))
        .ok_or_else(|| {
            "Tên file không đúng mẫu Teacher Workspace_x.y.z_x64-setup.exe.".to_string()
        })?;
    parse_version(version)?;
    Ok(version.to_string())
}

fn sha256(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|error| format!("Không đọc được installer: {error}"))?;
    let mut hash = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let count = file
            .read(&mut buffer)
            .map_err(|error| format!("Không đọc được installer: {error}"))?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hash.finalize()))
}

fn inspect_installer(path: &Path, current_version: &str) -> Result<(PathBuf, ManualUpdateInfo), String> {
    let canonical = path
        .canonicalize()
        .map_err(|_| "Không tìm thấy file cập nhật đã chọn.".to_string())?;
    let metadata = canonical
        .metadata()
        .map_err(|error| format!("Không đọc được thông tin installer: {error}"))?;
    if !metadata.is_file() {
        return Err("Mục đã chọn không phải là một file.".into());
    }
    if !(MIN_INSTALLER_BYTES..=MAX_INSTALLER_BYTES).contains(&metadata.len()) {
        return Err("Dung lượng installer không hợp lệ (yêu cầu từ 1 MB đến 1 GB).".into());
    }
    let file_name = canonical
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Tên file cập nhật không hợp lệ.".to_string())?
        .to_string();
    let version = installer_version(&file_name)?;
    if parse_version(&version)? <= parse_version(current_version)? {
        return Err(format!(
            "Bản {version} không mới hơn phiên bản đang dùng {current_version}."
        ));
    }
    let mut header = [0_u8; 2];
    File::open(&canonical)
        .and_then(|mut file| file.read_exact(&mut header))
        .map_err(|error| format!("Không đọc được installer: {error}"))?;
    if header != *b"MZ" {
        return Err("File đã chọn không phải chương trình Windows hợp lệ.".into());
    }
    let digest = sha256(&canonical)?;
    Ok((
        canonical,
        ManualUpdateInfo {
            file_name,
            version,
            current_version: current_version.to_string(),
            size_bytes: metadata.len(),
            sha256: digest,
        },
    ))
}

fn backup_to(db: &rusqlite::Connection, path: &Path) -> Result<(), String> {
    db.execute("VACUUM INTO ?1", [path.to_string_lossy().as_ref()]).map_err(|e| format!("Không thể sao lưu. Đã dừng cập nhật: {}", e))?;
    let verify = rusqlite::Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e| e.to_string())?;
    let result: String = verify.query_row("PRAGMA quick_check", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if result != "ok" { return Err("Bản sao lưu không hợp lệ. Đã dừng cập nhật.".into()); }
    Ok(())
}

#[tauri::command]
pub fn updater_ready(app: tauri::AppHandle) -> bool {
    let plugins = &app.config().plugins.0;
    plugins.get("updater").map(|c| {
        c.get("pubkey").and_then(|v| v.as_str()).is_some_and(|s| !s.trim().is_empty())
        && c.get("endpoints").and_then(|v| v.as_array()).is_some_and(|a| !a.is_empty())
    }).unwrap_or(false)
}

// VACUUM INTO creates a consistent SQLite snapshot including committed WAL records.
// No user-provided path or SQL is accepted by this command.
#[tauri::command]
pub fn backup_before_update(app: tauri::AppHandle, state: tauri::State<'_, DatabaseState>) -> Result<String, String> {
    let guard = state.0.lock().map_err(|_| "Không khóa được dữ liệu để sao lưu")?;
    let db = guard.as_ref().map_err(Clone::clone)?;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let path = dir.join(format!("before-update-{}-{}.sqlite3", app.package_info().version, stamp));
    backup_to(db, &path)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn inspect_manual_update(app: tauri::AppHandle, path: String) -> Result<ManualUpdateInfo, String> {
    let current = app.package_info().version.to_string();
    inspect_installer(Path::new(&path), &current).map(|(_, info)| info)
}

#[tauri::command]
pub fn launch_manual_update(
    app: tauri::AppHandle,
    path: String,
    expected_sha256: String,
) -> Result<(), String> {
    let current = app.package_info().version.to_string();
    let (canonical, info) = inspect_installer(Path::new(&path), &current)?;
    if !expected_sha256.eq_ignore_ascii_case(&info.sha256) {
        return Err("File cập nhật đã thay đổi sau khi kiểm tra. Hãy chọn lại file.".into());
    }
    #[cfg(target_os = "windows")]
    {
        Command::new(canonical)
            .spawn()
            .map_err(|error| format!("Không mở được installer: {error}"))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = canonical;
        Err("Cập nhật từ file chỉ hoạt động trên Windows.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn snapshot_includes_wal_and_does_not_overwrite_an_existing_backup() {
        let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("teacher-workspace-update-test-{}", stamp));
        std::fs::create_dir(&dir).unwrap();
        {
            let db = rusqlite::Connection::open(dir.join("main.sqlite3")).unwrap();
            db.execute_batch("PRAGMA journal_mode=WAL; CREATE TABLE sample(value TEXT); INSERT INTO sample VALUES('Lớp 10A1');").unwrap();
            let path = dir.join("backup.sqlite3");
            backup_to(&db, &path).unwrap();
            assert!(backup_to(&db, &path).is_err());
            let snapshot = rusqlite::Connection::open(&path).unwrap();
            let value: String = snapshot.query_row("SELECT value FROM sample", [], |r| r.get(0)).unwrap();
            assert_eq!(value, "Lớp 10A1");
        }
        // This directory was uniquely created by this test and contains only its fixtures.
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn accepts_the_tauri_installer_name_and_download_copy_suffix() {
        assert_eq!(installer_version("Teacher Workspace_1.4.1_x64-setup.exe").unwrap(), "1.4.1");
        assert_eq!(installer_version("Teacher Workspace_1.4.2_x64-setup (2).exe").unwrap(), "1.4.2");
    }

    #[test]
    fn rejects_wrong_products_and_invalid_versions() {
        assert!(installer_version("Other App_9.0.0_x64-setup.exe").is_err());
        assert!(installer_version("Teacher Workspace_1.4_x64-setup.exe").is_err());
        assert!(installer_version("Teacher Workspace_1.4.2_x64-setup.msi").is_err());
    }

    #[test]
    fn compares_three_part_versions_numerically() {
        assert!(parse_version("1.10.0").unwrap() > parse_version("1.9.99").unwrap());
        assert!(parse_version("1.4").is_err());
    }
}
