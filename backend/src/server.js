import { crearApp } from './app.js';
import { obtenerDb } from './db/conexion.js';

const puerto = process.env.PORT || 3000;

obtenerDb();
crearApp().listen(puerto, () => {
  console.log(`Servidor escuchando en el puerto ${puerto}`);
});
