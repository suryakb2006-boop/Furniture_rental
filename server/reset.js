// Deletes server/rental.db and recreates it with fresh sample data.
import fs from 'node:fs';
import { DB_PATH, openDatabase } from './db.js';

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
await openDatabase({ fresh: true });
console.log('Database reset:', DB_PATH);
