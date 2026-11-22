# E‑Enstitü / Psikolojik Araştırmalar Enstitüsü

Live site: https://eenstitu.com

The current site runs on the `eenstitu-web` Cloudflare Worker with the `eenstitu-db` D1 database. The previous OpenAI Sites project is no longer the deployment target.

## Local development

```sh
npm ci
npm run dev
```

## Build, verify and deploy

Pushing to `main` deploys automatically. The `eenstitu-web` Worker is connected to this repository through Cloudflare Workers Builds:

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Build variable: `NODE_VERSION=22`
- Preview builds for other branches are off.

Build logs are under Workers & Pages → `eenstitu-web` → Deployments. Run the tests before pushing:

```sh
npm test
```

Manual deploy (only if needed) still works with `npm run deploy` after `wrangler login`.

`vite.cloudflare.config.ts` and `wrangler.cloudflare.jsonc` are the production configuration. Authenticate with Wrangler using the Cloudflare account that owns these resources. Custom domains include `eenstitu.com` and `www.eenstitu.com`; www redirects to the apex.

## Runtime configuration

`RESEND_API_KEY` and `SESSION_SECRET` are Cloudflare secrets. Their values are not stored in Git. Preserve the existing session secret when deploying. Resend sends from `Eğitim Enstitüsü <info@eenstitu.com>` in the personal `mahmutck` team. Incoming mail remains with the existing GoDaddy mailbox provider.

The D1 database holds certificate verification records and administrator authentication state. An existing database must not be reinitialized during a code deployment. New database setup uses the SQL files under `drizzle/` and the administrator setup flow at `/admin`.

## Participant certificates

Each participant on a verification page (`/<kayit>`) can have its own certificate PDF. Upload them from `/admin` → record → **Sertifikalar**, one by one or with **Toplu PDF yükle** (files are matched to participants by file name and can be corrected before upload). The admin page also renders a JPEG preview of the first page so the certificate opens as an image on phones.

- Files are stored in the `eenstitu-certificates` KV namespace (binding `CERTIFICATES`) under `certificates/<slug>/<name-key>/<version>.pdf|jpg`; the current version per participant is in the D1 table `certificate_files`.
- Public URLs: `/sertifika/<slug>/<name-key>.pdf` (inline, add `?indir=1` to download) and `.jpg` for the preview. `/<slug>#<name-key>` opens that participant's certificate directly.
- KV free plan: 1 GB per account (~180 certificates at ~5 MB). Move to R2 when it fills up.

## Backups

This repository stores source code, public images, migration SQL, and deployment configuration. Runtime database exports, passwords, sessions, reset links, API keys, `.env` files, and local backup files are excluded. Keep database backups separately in protected storage.
