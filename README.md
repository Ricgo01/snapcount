# SNAPCOUNT

Marcadores en vivo de la NFL, standings, brackets de playoffs, rosters y estadísticas de equipos y jugadores, con historial completo de temporadas desde 2002. Next.js App Router, sin cuentas de usuario — todo el contenido es público y de solo lectura.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Supabase (Postgres) · Upstash Redis (rate limiting) · datos de la API pública de ESPN y de [nflverse](https://github.com/nflverse/nflverse-data) (depth charts históricos).

## Cómo funciona

- Los datos en vivo/actuales se leen directo de la API de ESPN (`lib/espn/`) con cache de Next.js.
- Un cron de GitHub Actions llama a `POST /api/refresh` cada 5 minutos: invalida el cache y guarda el marcador actual en Supabase (tabla `games`), además de las stats de los partidos que acaban de terminar (`game_details`).
- `POST /api/backfill?season=YYYY` carga una temporada completa (18 semanas) a Supabase — se corre una vez por temporada.
- `POST /api/backfill-rosters?season=YYYY` carga los depth charts históricos de esa temporada desde nflverse.
- Los tres endpoints de arriba están protegidos por `CRON_SECRET` (header `Authorization: Bearer <secret>`, comparación constant-time) y tienen un cooldown de 1h para evitar re-ejecuciones costosas.
- Un middleware (`proxy.ts`) aplica rate limiting por IP (300 req/60s) usando Upstash Redis; si no está configurado, no bloquea nada (fail-open).

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completar con tus credenciales
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Variables de entorno

Ver `.env.local.example` para la lista completa con comentarios. Resumen:

| Variable | Para qué | Requerida |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Key pública, solo lectura (RLS) | Sí |
| `SUPABASE_SECRET_KEY` | Key de servidor, bypassea RLS — nunca se expone al cliente | Sí |
| `CRON_SECRET` | Protege `/api/refresh` y `/api/backfill*` (`openssl rand -hex 32`) | Sí |
| `NEXT_PUBLIC_SITE_URL` | URL pública del deploy, usada en sitemap/robots/OG | Sí |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting por IP | Opcional |

Sin `UPSTASH_*` el rate limiter simplemente no aplica límite (no rompe nada en local).

### Base de datos

El esquema vive en `supabase/migrations/*.sql` — correrlas en el SQL Editor de Supabase (o vía `supabase db push`) en orden.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run shots:dev` | Capturas de pantalla (Playwright) contra `localhost:3000` — QA visual manual |
| `npm run shots:prod` | Mismo pero contra el deploy de producción (`SHOTS_BASE_URL` para apuntar a otro host) |

## Deploy

Pensado para Vercel. El cron (`.github/workflows/cron.yml`) llama a `/api/refresh` cada 5 minutos usando los secrets `APP_URL` y `CRON_SECRET` del repo de GitHub. CI (`.github/workflows/ci.yml`) corre lint + typecheck + build en cada push/PR a `main`; no necesita secrets porque los clientes de Supabase/Upstash degradan a `null` sin sus variables de entorno.
