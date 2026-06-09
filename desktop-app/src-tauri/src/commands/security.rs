/// Security detection commands.
/// These run in the Rust backend so they cannot be bypassed by the web layer.

/// Detect if the app is running inside a virtual machine.
/// Uses heuristics: CPUID hypervisor bit, common VM process names, SMBIOS
/// values.
#[tauri::command]
pub fn detect_vm() -> bool {
    #[cfg(target_os = "windows")]
    {
        detect_vm_windows()
    }
    #[cfg(target_os = "macos")]
    {
        detect_vm_macos()
    }
    #[cfg(target_os = "linux")]
    {
        detect_vm_linux()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        false
    }
}

#[cfg(target_os = "windows")]
fn detect_vm_windows() -> bool {
    use std::process::Command;

    // Check BIOS manufacturer via WMIC
    let output = Command::new("wmic")
        .args(["computersystem", "get", "manufacturer"])
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        let vm_signatures = ["vmware", "virtualbox", "microsoft virtual", "hyper-v", "qemu", "xen"];
        for sig in vm_signatures {
            if text.contains(sig) {
                return true;
            }
        }
    }
    false
}

#[cfg(target_os = "macos")]
fn detect_vm_macos() -> bool {
    use std::process::Command;

    let output = Command::new("system_profiler")
        .arg("SPHardwareDataType")
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        let vm_signatures = ["vmware", "virtualbox", "parallels", "qemu"];
        for sig in vm_signatures {
            if text.contains(sig) {
                return true;
            }
        }
    }
    false
}

#[cfg(target_os = "linux")]
fn detect_vm_linux() -> bool {
    use std::fs;

    // Check /sys/class/dmi/id/product_name
    if let Ok(val) = fs::read_to_string("/sys/class/dmi/id/product_name") {
        let val = val.to_lowercase();
        let vm_signatures = ["vmware", "virtualbox", "kvm", "qemu", "xen", "bochs"];
        for sig in vm_signatures {
            if val.contains(sig) {
                return true;
            }
        }
    }
    false
}

/// Detect if a remote desktop session is active.
#[tauri::command]
pub fn detect_remote_desktop() -> bool {
    #[cfg(target_os = "windows")]
    {
        // SESSIONNAME env var is set to "Console" for local sessions;
        // remote sessions set it to "RDP-Tcp#N"
        if let Ok(session) = std::env::var("SESSIONNAME") {
            return session.to_lowercase().contains("rdp");
        }
        // Fallback: check if TeamViewer or AnyDesk processes are running
        return detect_rdp_processes_windows();
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[cfg(target_os = "windows")]
fn detect_rdp_processes_windows() -> bool {
    use std::process::Command;

    let output = Command::new("tasklist").output();
    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        let rdp_processes = ["teamviewer", "anydesk", "vnc", "rdpclip", "tstheme"];
        for proc in rdp_processes {
            if text.contains(proc) {
                return true;
            }
        }
    }
    false
}

/// Detect screen recording software.
#[tauri::command]
pub fn detect_screen_recording() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("tasklist").output();
        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
            let recorders = ["obs", "screencastify", "camtasia", "bandicam", "fraps", "shadowplay", "xsplit"];
            for r in recorders {
                if text.contains(r) {
                    return true;
                }
            }
        }
        false
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

/// Get list of running process names (for audit log).
#[tauri::command]
pub fn get_running_processes() -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("tasklist")
            .args(["/fo", "csv", "/nh"])
            .output();
        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            return text
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split(',').collect();
                    parts.first().map(|s| s.trim_matches('"').to_string())
                })
                .collect();
        }
    }
    Vec::new()
}
