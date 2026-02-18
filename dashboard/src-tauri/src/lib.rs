use std::process::{Child, Command};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::sync::Mutex;
use tauri::Manager;

struct ServerProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Find dashboard directory (parent of src-tauri in dev, or exe dir in prod)
    let server_dir = if cfg!(debug_assertions) {
        std::env::current_dir().unwrap().parent().unwrap().to_path_buf()
    } else {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| std::env::current_dir().unwrap())
    };

    // Start node server (hidden console window on Windows)
    let child = {
        #[cfg(windows)]
        {
            Command::new("node")
                .args(["server.js", "--no-open"])
                .current_dir(&server_dir)
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .spawn()
                .expect("Failed to start node server. Is Node.js installed?")
        }
        #[cfg(not(windows))]
        {
            Command::new("node")
                .args(["server.js", "--no-open"])
                .current_dir(&server_dir)
                .spawn()
                .expect("Failed to start node server. Is Node.js installed?")
        }
    };

    // Wait for server to be ready
    std::thread::sleep(std::time::Duration::from_millis(2000));

    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(Some(child))))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill server when window closes
                let state = window.state::<ServerProcess>();
                let child = state.0.lock().unwrap().take();
                if let Some(child) = child {
                    #[cfg(windows)]
                    {
                        let pid = child.id();
                        let _ = Command::new("taskkill")
                            .args(["/PID", &pid.to_string(), "/T", "/F"])
                            .creation_flags(0x08000000)
                            .output();
                    }
                    #[cfg(not(windows))]
                    {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
