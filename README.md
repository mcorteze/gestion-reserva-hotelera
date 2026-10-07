# Gestión Reserva Hotelera

Sistema de gestión de reservas para el Hotel Pacific Reef, desarrollado bajo la metodología Scrum.

## Estructura del proyecto

- `frontend/`: aplicación web (React + Vite + React Router)
- `backend/`: API REST (Node.js + Express) con base de datos SQLite (better-sqlite3)
- `backend/database/`: scripts de base de datos (v1 semana 4, v2 semana 6, v3 construcción)
- `docs/`: diagramas UML y vistas de diseño

## Funcionalidades por épica

| Épica | Historias | Qué incluye |
|---|---|---|
| 0. Preparación del ambiente | E0-HU1 a E0-HU3 | Repositorio, servidor y base de datos, frameworks |
| A. Cuentas y acceso | HU-01, HU-02, HU-14, HU-15 | Registro, inicio de sesión por rol, cuentas de trabajadores y clientes |
| B. Catálogo y experiencia | HU-03, HU-04, HU-11, HU-13 | Catálogo con fotografías, calendario de disponibilidad, idioma ES/EN, edición del catálogo |
| C. Gestión de reservas | HU-05, HU-06, HU-07, HU-12 | Selección de días, verificación con sugerencias, registro, modificación y cancelación |
| D. Pagos y confirmación | HU-08, HU-09, HU-10 | Cálculo del 30%, pago en línea (simulado), ticket con código QR |
| E. Administración y reportes | HU-16, HU-17, HU-18 | Precios Turista/Premium, reportes por periodo, vista del personal |

## Servicios web externos consumidos

- **api.qrserver.com**: genera la imagen del código QR del ticket de reserva.
- **mindicador.cl**: entrega el dólar observado para mostrar precios aproximados en USD a turistas.

Si un servicio externo no responde, la aplicación sigue funcionando: el ticket se emite y el QR se genera en la siguiente consulta, y el catálogo se muestra solo en CLP.

## API para otras aplicaciones

`GET /api` entrega la lista completa de recursos. Los principales son:

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/registro`, `/api/auth/ingreso` | público |
| GET | `/api/habitaciones`, `/api/habitaciones/disponibles?desde&hasta` | público |
| GET | `/api/habitaciones/:id/disponibilidad?desde&hasta` | público |
| POST | `/api/reservas`, `/api/reservas/:id/pagos` | cliente |
| GET | `/api/reservas?desde&hasta` | administradores y personal |
| PUT | `/api/habitaciones/precios` | administrador del hotel |
| GET | `/api/reportes/reservas?desde&hasta` | administrador del hotel |
| GET | `/api/indicadores/dolar` | público |

Las rutas protegidas usan la cabecera `Authorization: Bearer <token>`, con el token obtenido en `/api/auth/ingreso`.

## Cómo levantar el proyecto en local

```
cd backend
npm install
npm run dev
```

En otra terminal:

```
cd frontend
npm install
npm run dev
```

El frontend queda en `http://localhost:5173` y redirige `/api` al backend en el puerto 3000. La base de datos se crea sola en `backend/data/hotel.db` con los datos de prueba.

## Pruebas

```
npm test --prefix backend
npm test --prefix frontend
```

- Backend: 37 pruebas funcionales por épica (node:test + supertest) sobre una base de datos en memoria.
- Frontend: 10 pruebas de pantallas (esbuild + jsdom) contra el backend real.

## Ambiente de prueba en Render

El archivo `render.yaml` define el servicio web gratuito. El mismo servidor entrega la API y el frontend compilado.

1. En Render, elegir **New > Blueprint** y conectar este repositorio de GitHub.
2. Confirmar la creación del servicio `gestion-reserva-hotelera`.
3. Al terminar el despliegue, la URL pública queda en el panel del servicio.

En el plan gratuito, el servicio se suspende tras 15 minutos sin uso y la primera visita tarda cerca de un minuto en despertar. Al reiniciarse, la base de datos vuelve a los datos de prueba iniciales.

Para enviar el ticket por correo real se configuran las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USUARIO`, `SMTP_CLAVE` y `SMTP_REMITENTE`. Sin ellas, el envío queda registrado como simulado.

## Cuentas de prueba

| Perfil | Correo | Contraseña |
|---|---|---|
| Cliente | ana.torres@correo.com | Cliente2026 |
| Administrador de reservas | paula.rios@pacificreef.cl | Reservas2026 |
| Administrador del hotel | jorge.fuentes@pacificreef.cl | Hotel2026 |
| Personal del hotel | luis.soto@pacificreef.cl | Personal2026 |

Tarjetas de prueba: `4242 4242 4242 4242` se aprueba y `4000 0000 0000 0002` se rechaza (cualquier vencimiento futuro y CVV de 3 dígitos).

## Equipo

Manuel Cortez Echeverria
