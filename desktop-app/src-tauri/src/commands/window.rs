use tauri::{AppHandle, Manager};

/// Force the main window into fullscreen.
#[tauri::command]
pub fn force_fullscreen(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window.set_fullscreen(true).map_err(|e| e.to_string())
}

/// Exit fullscreen mode.
#[tauri::command]
pub fn exit_fullscreen(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window.set_fullscreen(false).map_err(|e| e.to_string())
}

/// Returns the number of available monitors.
#[tauri::command]
pub fn get_monitor_count(app: AppHandle) -> usize {
    app.available_monitors()
        .map(|m| m.len())
        .unwrap_or(1)
}

/// Pin the window above all other windows.
#[tauri::command]
pub fn set_always_on_top(app: AppHandle, value: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window.set_always_on_top(value).map_err(|e| e.to_string())
}
