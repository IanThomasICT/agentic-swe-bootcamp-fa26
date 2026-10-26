import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

export function createDatabase(filename = resolve(process.cwd(), "users.db")): DatabaseSync {
  const database = new DatabaseSync(filename);
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR,
      email VARCHAR UNIQUE,
      password VARCHAR
    );
  `);
  return database;
}

export const database = createDatabase();
