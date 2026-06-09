use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::security::detect_vm,
            commands::security::detect_remote_desktop,
            commands::security::detect_screen_recording,
            commands::security::get_running_processes,
            commands::system::get_system_info,
            commands::window::force_fullscreen,
            commands::window::exit_fullscreen,
            commands::window::get_monitor_count,
            commands::window::set_always_on_top,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // Prevent the window from being draggable by default
            window.set_title("ENUM Secure Exam Client").unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
