import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { cargarDatosPrueba } from './semilla.js';

const carpeta = path.dirname(fileURLToPath(import.meta.url));
const rutaEsquema = path.join(carpeta, '..', '..', 'database', 'base_datos_v3.sql');

let db;

export function obtenerDb() {
  if (db) return db;

  const ruta = process.env.DB_RUTA || path.join(carpeta, '..', '..', 'data', 'hotel.db');
  if (ruta !== ':memory:') fs.mkdirSync(path.dirname(ruta), { recursive: true });

  db = new Database(ruta);
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(rutaEsquema, 'utf8'));

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM habitacion').get();
  if (total === 0) cargarDatosPrueba(db);

  return db;
}
