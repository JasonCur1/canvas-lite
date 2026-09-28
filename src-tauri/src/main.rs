// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    let migrations = vec![
        Migration {
        version: 1,
        description: "create classes and assignments tables",
        sql: "
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                term TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                due_date TEXT,
                status TEXT NOT NULL DEFAULT 'not_started',
                details TEXT,
                progress_notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
            CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
        ",
        kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "calendar sync: external ids, settings, course mappings",
            sql: "
                ALTER TABLE assignments ADD COLUMN external_uid TEXT;
                ALTER TABLE assignments ADD COLUMN missing_from_feed INTEGER NOT NULL DEFAULT 0;
                CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_external_uid
                    ON assignments(external_uid) WHERE external_uid IS NOT NULL;

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );

                CREATE TABLE IF NOT EXISTS course_mappings (
                    hint TEXT PRIMARY KEY,
                    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE
                );
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tracker.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
