// Credentials are deliberately outside SQLite, exports and updater snapshots.
#[cfg(target_os = "windows")]
fn entry(id: &str) -> Result<keyring::Entry, String> {
    let account = if id == "default" { "gemini".to_string() } else { format!("gemini:{}", id) };
    keyring::Entry::new("com.teacherworkspace.desktop.ai", &account)
        .map_err(|_| "Cannot access Windows Credential Manager".to_string())
}

#[tauri::command]
pub fn ai_read_key(id: Option<String>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        match entry(id.as_deref().unwrap_or("default"))?.get_password() {
            Ok(key) => Ok(key),
            Err(keyring::Error::NoEntry) => Ok(String::new()),
            Err(_) => Err("Cannot read API key from Windows Credential Manager".into()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    Err("Persistent AI credentials are supported on Windows only".into())
}

#[tauri::command]
pub fn ai_store_key(key: String, id: Option<String>) -> Result<(), String> {
    if !key.is_empty() && (key.len() < 10 || key.len() > 300 || key.chars().any(char::is_whitespace)) {
        return Err("Invalid API key".into());
    }
    #[cfg(target_os = "windows")]
    {
        let credential = entry(id.as_deref().unwrap_or("default"))?;
        if key.is_empty() {
            match credential.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                Err(_) => Err("Cannot delete API key".into()),
            }
        } else {
            credential.set_password(&key).map_err(|_| "Cannot securely save API key".into())
        }
    }
    #[cfg(not(target_os = "windows"))]
    Err("Persistent AI credentials are supported on Windows only".into())
}

#[tauri::command]
pub fn ai_delete_key(id: String) -> Result<(), String> {
    if id.is_empty() || id.len() > 100 { return Err("Invalid credential id".into()); }
    #[cfg(target_os = "windows")]
    {
        match entry(&id)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("Cannot delete API key".into()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    Err("Persistent AI credentials are supported on Windows only".into())
}
