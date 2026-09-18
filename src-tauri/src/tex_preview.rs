use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, process::{Command, Stdio}, sync::{Arc, atomic::{AtomicBool, Ordering}}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};
use tauri::Manager;

#[derive(Default)]
pub struct PreviewState {
    busy: Arc<AtomicBool>,
    cancel: Arc<AtomicBool>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub engine: String,
    pub executable: String,
    pub preamble_path: String,
    pub project_dir: String,
}
impl Default for Settings {
    fn default() -> Self { Self { engine: "pdflatex".into(), executable: String::new(), preamble_path: String::new(), project_dir: String::new() } }
}
#[derive(Serialize)]
pub struct CompileResult { pdf: Vec<u8>, log: String, success: bool }
fn fail(e: impl std::fmt::Display) -> String { e.to_string() }
fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(fail)?.join("tex-preview-settings.json"))
}
#[tauri::command]
pub fn tex_preview_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_path(&app)?;
    if !path.exists() { return Ok(Settings::default()); }
    serde_json::from_slice(&fs::read(path).map_err(fail)?).map_err(fail)
}
fn validate(settings: &Settings) -> Result<(), String> {
    if !["pdflatex", "xelatex", "lualatex"].contains(&settings.engine.as_str()) {
        return Err("Chỉ hỗ trợ pdfLaTeX, XeLaTeX hoặc LuaLaTeX.".into());
    }
    if !settings.executable.is_empty() {
        let path = Path::new(&settings.executable);
        if !path.is_absolute() || !path.is_file() { return Err("Đường dẫn trình biên dịch không tồn tại.".into()); }
        let stem = path.file_stem().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
        if stem != settings.engine { return Err("File thực thi phải khớp trình biên dịch đã chọn.".into()); }
    }
    if !Path::new(&settings.preamble_path).is_file() { return Err("Chọn file khai báo hoặc main.tex có sẵn.".into()); }
    if !Path::new(&settings.project_dir).is_dir() { return Err("Chọn thư mục gốc của project LaTeX chứa ảnh và setting.".into()); }
    Ok(())
}
#[tauri::command]
pub fn tex_preview_save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    validate(&settings)?;
    let path = settings_path(&app)?;
    fs::write(path, serde_json::to_vec_pretty(&settings).map_err(fail)?).map_err(fail)
}
#[tauri::command]
pub fn tex_preview_read_setup(settings: Settings) -> Result<String, String> {
    validate(&settings)?;
    let bytes = fs::read(&settings.preamble_path).map_err(fail)?;
    if bytes.len() > 2_000_000 { return Err("File khai báo lớn hơn 2 MB.".into()); }
    String::from_utf8(bytes).map(|s| s.trim_start_matches('\u{feff}').to_string()).map_err(|_| "File khai báo cần mã hóa UTF-8.".into())
}
#[tauri::command]
pub fn tex_preview_cancel(state: tauri::State<'_, PreviewState>) { state.cancel.store(true, Ordering::SeqCst); }

fn tex_path(path: &Path) -> String {
    path.to_string_lossy().trim_start_matches(r"\\?\").replace('\\', "/")
}

fn executable(settings: &Settings) -> PathBuf {
    if !settings.executable.is_empty() { return PathBuf::from(&settings.executable); }
    #[cfg(windows)] {
        if let Ok(entries) = fs::read_dir(r"C:\texlive") {
            let mut dirs: Vec<_> = entries.filter_map(Result::ok).map(|e| e.path()).collect();
            dirs.sort();
            for dir in dirs.into_iter().rev() {
                for arch in ["windows", "win32"] {
                    let path = dir.join("bin").join(arch).join(format!("{}.exe", settings.engine));
                    if path.is_file() { return path; }
                }
            }
        }
    }
    PathBuf::from(&settings.engine)
}
struct BusyGuard(Arc<AtomicBool>);
impl Drop for BusyGuard { fn drop(&mut self) { self.0.store(false, Ordering::SeqCst); } }
struct TempGuard(PathBuf);
impl Drop for TempGuard { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); } }

#[tauri::command]
pub async fn tex_preview_compile(app: tauri::AppHandle, state: tauri::State<'_, PreviewState>, settings: Settings, document: String, question: String) -> Result<CompileResult, String> {
    validate(&settings)?;
    if document.len() > 2_500_000 || question.len() > 500_000 { return Err("Nội dung xem trước quá lớn.".into()); }
    if state.busy.swap(true, Ordering::SeqCst) { return Err("Một lượt biên dịch đang chạy. Hãy đợi hoặc hủy.".into()); }
    state.cancel.store(false, Ordering::SeqCst);
    let guard = BusyGuard(state.busy.clone());
    let cancel = state.cancel.clone();
    let base = app.path().app_cache_dir().map_err(fail)?;
    tauri::async_runtime::spawn_blocking(move || {
        let _busy = guard;
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).map_err(fail)?.as_nanos();
        let dir = base.join(format!("tex-preview-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(dir.join("ans")).map_err(fail)?;
        let _temp = TempGuard(dir.clone());
        fs::write(dir.join("preview.tex"), document).map_err(fail)?;
        fs::write(dir.join("question.tex"), question).map_err(fail)?;
        let project = fs::canonicalize(&settings.project_dir).map_err(fail)?;
        let setup_parent = Path::new(&settings.preamble_path).parent().unwrap_or(&project);
        let separator = if cfg!(windows) { ";" } else { ":" };
        // Final empty entry preserves the TeX distribution's default search path.
        let inputs = format!(".{}{}//{}{}//{}", separator, tex_path(&project), separator, tex_path(setup_parent), separator);
        let engine = executable(&settings);
        let start = Instant::now();
        for pass in 0..2 {
            let stdout = fs::File::create(dir.join(format!("stdout-{pass}.txt"))).map_err(fail)?;
            let stderr = stdout.try_clone().map_err(fail)?;
            let mut command = Command::new(&engine);
            command.current_dir(&dir)
                .args(["-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", "preview.tex"])
                .env("TEXINPUTS", &inputs).env("openout_any", "p")
                .stdin(Stdio::null()).stdout(Stdio::from(stdout)).stderr(Stdio::from(stderr));
            #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
            let mut child = command.spawn().map_err(|e| format!("Không chạy được {}: {}. Hãy chọn đúng file .exe trong thiết lập TeX Live.", engine.display(), e))?;
            let status = loop {
                if cancel.load(Ordering::SeqCst) || start.elapsed() > Duration::from_secs(120) {
                    let _ = child.kill(); let _ = child.wait();
                    return Err(if cancel.load(Ordering::SeqCst) { "Đã hủy biên dịch." } else { "Biên dịch vượt quá 120 giây." }.into());
                }
                match child.try_wait() {
                    Ok(Some(status)) => break status,
                    Ok(None) => std::thread::sleep(Duration::from_millis(50)),
                    Err(e) => { let _ = child.kill(); let _ = child.wait(); return Err(fail(e)); }
                }
            };
            if !status.success() {
                let log = fs::read(dir.join("preview.log")).or_else(|_| fs::read(dir.join(format!("stdout-{pass}.txt")))).unwrap_or_default();
                return Ok(CompileResult { pdf: vec![], log: String::from_utf8_lossy(&log).chars().take(100_000).collect(), success: false });
            }
        }
        let pdf_path = dir.join("preview.pdf");
        if fs::metadata(&pdf_path).map_err(fail)?.len() > 16 * 1024 * 1024 { return Err("PDF xem trước vượt quá 16 MB.".into()); }
        let pdf = fs::read(pdf_path).map_err(fail)?;
        let log = fs::read(dir.join("preview.log")).unwrap_or_default();
        Ok(CompileResult { pdf, log: String::from_utf8_lossy(&log).chars().take(100_000).collect(), success: true })
    }).await.map_err(fail)?
}
