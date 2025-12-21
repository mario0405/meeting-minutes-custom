#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use env_logger;
use log;
use std::fs::OpenOptions;
use std::path::PathBuf;

fn init_logging() {
    if cfg!(debug_assertions) {
        std::env::set_var("RUST_LOG", "info");
        env_logger::init();
        return;
    }

    let log_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("protocolito")
        .join("logs");

    if let Err(e) = std::fs::create_dir_all(&log_dir) {
        eprintln!("Failed to create log directory {:?}: {}", log_dir, e);
        std::env::set_var("RUST_LOG", "info");
        env_logger::init();
        return;
    }

    let log_path = log_dir.join("app.log");
    let log_file = match OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open log file {:?}: {}", log_path, e);
            std::env::set_var("RUST_LOG", "info");
            env_logger::init();
            return;
        }
    };

    let mut builder = env_logger::Builder::from_default_env();
    builder.target(env_logger::Target::Pipe(Box::new(log_file)));
    builder.filter_level(log::LevelFilter::Info);
    builder.init();

    log::info!("Logging to {}", log_path.display());

    std::panic::set_hook(Box::new(|panic_info| {
        log::error!("panic: {}", panic_info);
    }));
}

fn main() {
    init_logging();

    // Async logger will be initialized lazily when first needed (after Tauri runtime starts)
    log::info!("Starting application...");
    app_lib::run();
}
