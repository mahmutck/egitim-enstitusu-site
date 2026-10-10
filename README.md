# E‑Enstitü / Psikolojik Araştırmalar Enstitüsü

Live site: https://eenstitu.com

The current site runs on the `eenstitu-web` Cloudflare Worker with the `eenstitu-db` D1 database. The previous OpenAI Sites project is no longer the deployment target.

## Local development

```sh
npm ci
npm run dev
```

## Build, verify and deploy

```sh
npm test
npm run deploy
```

`vite.cloudflare.config.ts` and `wrangler.cloudflare.jsonc` are the production configuration. Authenticate with Wrangler using the Cloudflare account that owns these resources. Custom domains include `eenstitu.com` and `www.eenstitu.com`; www redirects to the apex.

## Runtime configuration

`RESEND_API_KEY` and `SESSION_SECRET` are Cloudflare secrets. Their values are not stored in Git. Preserve the existing session secret when deploying. Resend sends from `Eğitim Enstitüsü <info@eenstitu.com>` in the personal `mahmutck` team. Incoming mail remains with the existing GoDaddy mailbox provider.

The D1 database holds certificate verification records and administrator authentication state. An existing database must not be reinitialized during a code deployment. New database setup uses the SQL files under `drizzle/` and the administrator setup flow at `/admin`.

## Backups

This repository stores source code, public images, migration SQL, and deployment configuration. Runtime database exports, passwords, sessions, reset links, API keys, `.env` files, and local backup files are excluded. Keep database backups separately in protected storage.
