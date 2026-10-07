// Ejecucion de la prueba de pantallas
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const carpeta = path.dirname(fileURLToPath(import.meta.url));
const salida = path.join(carpeta, '.salida', 'pantallas.mjs');

await build({
  entryPoints: [path.join(carpeta, 'pantallas.test.jsx')],
  outfile: salida,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  external: ['jsdom'],
  define: { 'process.env.NODE_ENV': '"development"' },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning'
});

await import(pathToFileURL(salida).href);
