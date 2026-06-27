/**
 * Database connection manager using sql.js (WebAssembly SQLite).
 * 
 * sql.js runs SQLite entirely in WebAssembly — no native compilation needed.
 * The database is loaded from disk on startup and saved periodically.
 */

import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { getConfig } from '../config';
import { initializeSchema } from './schema';

let _db: SqlJsDatabase | null = null;
let _SQL: SqlJsStatic | null = null;
let _saveTimer: NodeJS.Timeout | null = null;

// Save interval (every 30 seconds)
const SAVE_INTERVAL = 30000;

/**
 * Get the database singleton instance.
 * Initializes sql.js and loads/creates the database on first call.
 */
export async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  
  const config = getConfig();
  
  // Initialize sql.js (WebAssembly)
  if (!_SQL) {
    _SQL = await initSqlJs();
    console.log('[DB] sql.js WebAssembly initialized');
  }
  
  // Ensure data directory exists
  const dbDir = path.dirname(config.db.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Load existing database or create new one
  if (fs.existsSync(config.db.path)) {
    const fileBuffer = fs.readFileSync(config.db.path);
    _db = new _SQL.Database(fileBuffer);
    console.log(`[DB] Loaded existing database from ${config.db.path}`);
  } else {
    _db = new _SQL.Database();
    console.log(`[DB] Created new database`);
  }
  
  // Enable WAL-like behavior (sql.js uses in-memory, so just enable FK)
  _db.run('PRAGMA foreign_keys = ON');
  
  // Initialize schema
  initializeSchema(_db);
  
  // Save immediately
  saveDatabase();
  
  // Start periodic save
  startAutoSave();
  
  return _db;
}

/**
 * Save the in-memory database to disk.
 */
export function saveDatabase(): void {
  if (!_db) return;
  
  const config = getConfig();
  
  try {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.db.path, buffer);
  } catch (err) {
    console.error('[DB] Failed to save database:', err);
  }
}

/**
 * Start periodic auto-save.
 */
function startAutoSave(): void {
  if (_saveTimer) return;
  
  _saveTimer = setInterval(() => {
    if (_db) {
      saveDatabase();
    }
  }, SAVE_INTERVAL);
  
  console.log(`[DB] Auto-save enabled (every ${SAVE_INTERVAL / 1000}s)`);
}

/**
 * Close the database gracefully.
 */
export function closeDb(): void {
  if (_saveTimer) {
    clearInterval(_saveTimer);
    _saveTimer = null;
  }
  
  if (_db) {
    saveDatabase(); // Final save
    _db.close();
    _db = null;
    console.log('[DB] Connection closed and saved');
  }
}

/**
 * Helper: run a query and return all rows as objects.
 * sql.js returns modified rows for INSERT/UPDATE/DELETE, and results for SELECT.
 */
export function queryAll(sql: string, params: any[] = []): any[] {
  if (!_db) throw new Error('Database not initialized');
  
  const stmt = _db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  
  return results;
}

/**
 * Helper: run a query and return the first row as object.
 */
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper: execute a statement (INSERT, UPDATE, DELETE) and return affected rows.
 */
export function execute(sql: string, params: any[] = []): number {
  if (!_db) throw new Error('Database not initialized');
  
  _db.run(sql, params);
  const changes = _db.getRowsModified();
  return changes;
}

/**
 * Helper: execute multiple statements.
 */
export function executeMany(sql: string): void {
  if (!_db) throw new Error('Database not initialized');
  _db.run(sql);
}

export default { getDb, saveDatabase, closeDb, queryAll, queryOne, execute, executeMany };
