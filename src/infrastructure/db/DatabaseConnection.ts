import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private readonly db: Database.Database;

  private constructor(dbPath: string) {
    mkdirSync(join(dbPath, ".."), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  static getInstance(dbPath = "./data/nechmark.db"): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(dbPath);
    }
    return DatabaseConnection.instance;
  }

  get(): Database.Database {
    return this.db;
  }
}
