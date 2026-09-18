mod tex_preview;
mod database;
mod updates;
mod ai_credentials;
use std::sync::Mutex;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .manage(tex_preview::PreviewState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if updates::updater_ready(app.handle().clone()) {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            let path = app.path().app_data_dir()?;
            std::fs::create_dir_all(&path)?;
            // Keep the error for the UI's recovery screen instead of opening an empty database.
            let connection = database::open(&path.join("teacher-workspace.sqlite3"));
            app.manage(database::DatabaseState(Mutex::new(connection)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![tex_preview::tex_preview_settings, tex_preview::tex_preview_save_settings, tex_preview::tex_preview_read_setup, tex_preview::tex_preview_detect, tex_preview::tex_preview_compile, tex_preview::tex_preview_cancel, database::load_database, database::commit_database, database::load_question_bank, database::commit_question_bank, updates::updater_ready, updates::backup_before_update, updates::inspect_manual_update, updates::launch_manual_update, ai_credentials::ai_read_key, ai_credentials::ai_store_key, ai_credentials::ai_delete_key])
        .run(tauri::generate_context!())
        .expect("Teacher Workspace could not start");
}
