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

Visitors of a record page (`/<kayit>`) see the participant list only; the record API sends certificate links only to an admin session. A single certificate opens for whoever has its QR code / permanent link.

**Admin:** `/admin` → record → **Sertifikalar** shows the participant list. Each row has **Görüntüle** (PDF in a new tab), **İndir** (PDF download) and **Düzenle** (name on the certificate and serial number; the QR code and link stay the same). Certificate text, date and serial numbering are under the folded **Sertifika metni, tarih ve seri numaraları** section.

**Training dates:** each record has a training date range (**Eğitim tarih aralığı**, calendar in the record form; D1 table `training_dates`). In certificate text `{tarih}` becomes the Turkish range ("15-22 Mayıs 2026") and `{date}` the English one ("15–22 May 2026"). An empty certificate date uses the training end date.

**PDF:** nothing is stored per certificate. `GET /sertifika/<token>` returns the PDF (`?indir=1` for download; noindex, disallowed in robots.txt). The worker reads `public/certificate/base.pdf` through the `ASSETS` binding and appends a small incremental update with the name, text, date, serial and QR code (`worker/certificate-pdf.ts`). The token is a random 16-character value per participant, created once in the D1 table `certificate_links` and never changed, so the QR code on a downloaded PDF keeps opening the certificate. The link stops working if the participant is removed from the list; re-adding them restores the same link.

**Template:** `certificate-assets/template.pdf` is the blank vector template made from the original certificate; fonts are open-license substitutes (`certificate-assets/fonts/README.txt`). After changing the template or fonts, run `python3 certificate-assets/build_base.py` (needs `pikepdf` and `fonttools`) to rebuild `public/certificate/base.pdf` and `worker/certificate-base.json`.

## Backups

This repository stores source code, public images, migration SQL, and deployment configuration. Runtime database exports, passwords, sessions, reset links, API keys, `.env` files, and local backup files are excluded. Keep database backups separately in protected storage.
