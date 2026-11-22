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

Visitors of a record page (`/<kayit>`) see the participant list only; the record API sends certificate data only to an admin session. A single certificate is visible to the administrators and to whoever has that certificate's QR code / permanent link (`/sertifika/<token>`, noindex and disallowed in robots.txt).

### Generated from the template (default)

Each record has a training date range (**Eğitim tarih aralığı**, picked on a calendar in the record form; stored in the D1 table `training_dates`). In certificate text, `{tarih}` becomes the Turkish range (e.g. "15-22 Mayıs 2026") and `{date}` the English one ("15–22 May 2026").

`/admin` → record → **Sertifikalar** → **Sertifikaları şablondan üret**. Fill in the Turkish and English text (up to three lines each), the date and the serial numbers (**Boş seri numaralarını doldur** assigns prefix + next number in list order), then save. Each participant row has **Görüntüle** and **İndir**. Nothing is stored per certificate: the visitor's browser builds the certificate from `public/certificate/template.pdf` (blank vector template made from the original Illustrator certificate) with `app/certificates/generator.ts` — a JPEG preview on screen and a PDF on download. Each certificate carries a QR code with its own permanent link, `https://eenstitu.com/sertifika/<token>` (random 16-character token per participant, created once in the D1 table `certificate_links` and never changed). Anyone with the QR code or link sees that one certificate (image + PDF download); the link works while generation is on and the participant is still listed, and re-adding a removed participant restores the same link. Admins can copy each link with **Linki kopyala**. Fonts are open-license substitutes (see `public/certificate/fonts/README.txt`); layout coordinates are in points measured on the original.

### Uploaded PDFs (legacy, no admin UI)

The worker still serves PDFs uploaded earlier through `/api/admin/certificates` (KV namespace `eenstitu-certificates`, binding `CERTIFICATES`, D1 table `certificate_files`); an uploaded PDF takes precedence over the generated certificate. The upload screens were removed from `/admin`.

## Backups

This repository stores source code, public images, migration SQL, and deployment configuration. Runtime database exports, passwords, sessions, reset links, API keys, `.env` files, and local backup files are excluded. Keep database backups separately in protected storage.
