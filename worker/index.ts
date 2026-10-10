/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY?: string;
  SESSION_SECRET?: string;
  BOOTSTRAP_PASSWORD_HASH?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const submissionWindows = new Map<string, { count: number; resetAt: number }>();
const ADMIN_EMAILS = new Set(["info@eenstitu.com", "mahmutck@gmail.com"]);
const AUTH_COOKIE = "eenstitu_admin";
const authWindows = new Map<string, { count: number; resetAt: number }>();
const seedRecords = [
  ["hipnosomatik-17", "Hipnosomatik Eğitimi · 21–25 Kasım 2025", "Başarı ile tamamlayanların listesi aşağıdaki gibidir.", ["Ayşegül Tosun", "Dilek Ahrian", "Fatma Emin", "Ganime Saadet Çavuşoğlu", "Gülcan Kavlak", "Elif Başkut", "Burcu Atalay", "Hasan Demir", "Kübra Gümüştepe", "Leman Müezzinoğlu", "Nadide Sedef Suyun", "Nazlı Fırat", "Nilüfer Yurtseven", "Nurevşan Sema Hazırlar", "Cemalettin Sarı", "Tuğba Tutar", "Yasemin Budak", "Yıldız Makbul", "Yusuf Kılıçlar"]],
  ["hipnosomatik-0018", "Mezun Listesi", "12–16 Aralık 2025 tarihli Hipnosomatik teorik eğitimini başarı ile tamamlayanlar", ["Arzu Demir", "Aydan Kekik", "Ayşe Evin", "Ayşegül Tan", "Ayşe Gül Genç", "Ayşegül Işık", "Eda Karaçadır", "Merve Seher Hazırlar", "Naime Çöğür", "Mehmet Bastem", "Şengül Demirel", "Saniye Tuana Küçüksu", "Ümran Fırat"]],
  ["hipnosomatik-00019", "Hipnosomatik Teorik Eğitimi · 15–22 Mayıs 2026", "Başarı ile tamamlayanların listesi aşağıdadır.", ["Alev İlhan Göçmezoğlu", "Alicia Balcı Karamağara", "Ayşe Özdemir", "Berna Kartal", "Bahriye Turan", "Deniz Kabaklı", "Elif Cemre Işık", "Hacer Sünger", "Laila Diril", "Zeynep Kabaklı", "Nimet Atasoy", "Nurtaç Doğan", "Nuran Topalak", "Meral Can", "Banu Acar", "Saniye Emel Kulüp", "Juraeva Zulaykho", "Zehra Kodal Kassem"]],
  ["biosomatik11", "Biosomatik Eğitimi · 10–20 Nisan 2025", "Başarı ile tamamlayan katılımcılar", ["Banu Acar · Sertifika No: IS-11-025", "Psk. Gizem Badem · Sertifika No: IS-11-017"]],
  ["eğitim-enstitüsü1", "Eğitim Enstitüsü Sertifika Kaydı", "Sertifika belgesi", []],
  ["hipnosomatik-0020", "Hipnosomatik Eğitimi · 12–13 Temmuz", "Eğitimi başarı ile tamamlayanlar", ["Fiten Demiral", "Hasan Demir", "Nilay Yağızer", "Nilüfer Yurtseven", "Nimet Atasoy", "Nuran Topalak", "Öznur Demiral", "Yusuf Kılıçlar"]],
  ["21-grup-hipnosomatik", "21. Grup Hipnosomatik Eğitimi · 25–26 Temmuz 2026", "Eğitimi başarı ile tamamlayanlar", ["Alev İlhan", "Andreea Stati", "Arzu Demir", "Burcu Atalay", "Hacer Sünger", "Belma Yüksel", "Bedriye Esen", "Evren Arslan", "Fatma Emin", "Firdevs Arslan", "Hülya Tağısoy", "Hasan Demir", "Laila Diril", "Müslim Dişkaya", "Nadide Sedef Süyün", "Nilay Yağızer", "Nuran Topalak", "Yıldız Makbule Teke"]],
  ["mezunlar", "Mezunlarımız", "Eğitimlerini başarıyla tamamlayan katılımcıların sertifika doğrulama kayıtları", []],
] as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isRateLimited(request: Request) {
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const current = submissionWindows.get(key);

  if (!current || current.resetAt <= now) {
    submissionWindows.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }

  current.count += 1;
  return current.count > 5;
}

function authRateLimited(request: Request, scope: string, limit = 6) {
  const key = `${scope}:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
  const now = Date.now(); const current = authWindows.get(key);
  if (!current || current.resetAt <= now) { authWindows.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 }); return false; }
  current.count += 1; return current.count > limit;
}

function base64Url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function randomToken() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return base64Url(bytes); }
async function sha256(value: string) { const bytes = new TextEncoder().encode(value); const hash = await crypto.subtle.digest("SHA-256", bytes); return base64Url(new Uint8Array(hash)); }
async function hmac(value: string, secret: string) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)))); }
function validPasswordProof(value: string) { return /^[A-Za-z0-9_-]{40,}$/.test(value); }
function jsonError(message: string, status = 400) { return Response.json({ ok: false, message }, { status }); }
function validOrigin(request: Request) { const origin = request.headers.get("Origin"); return !origin || origin === new URL(request.url).origin; }

async function ensureAdminDb(env: Env) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS verification_records (slug TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT, graduates_json TEXT NOT NULL DEFAULT '[]', note TEXT, certificate_url TEXT, certificate_label TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_credentials (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, updated_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (id TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)"),
  ]);
  for (const [slug, title, subtitle, graduates] of seedRecords) await env.DB.prepare("INSERT OR IGNORE INTO verification_records (slug,title,subtitle,graduates_json,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(slug, title, subtitle, JSON.stringify(graduates), now, now).run();
  if (env.BOOTSTRAP_PASSWORD_HASH) for (const email of ADMIN_EMAILS) await env.DB.prepare("INSERT OR IGNORE INTO admin_credentials (email,password_hash,updated_at) VALUES (?,?,?)").bind(email, env.BOOTSTRAP_PASSWORD_HASH, now).run();
}

async function handleContactForm(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, message: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  if (!env.RESEND_API_KEY) {
    return Response.json({ ok: false, message: "E-posta hizmeti henüz yapılandırılmadı." }, { status: 503 });
  }

  if (isRateLimited(request)) {
    return Response.json({ ok: false, message: "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin." }, { status: 429 });
  }

  let data: Record<string, unknown>;
  try {
    data = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, message: "Form bilgileri okunamadı." }, { status: 400 });
  }

  const name = String(data.name || "").trim().slice(0, 120);
  const email = String(data.email || "").trim().toLowerCase().slice(0, 254);
  const phone = String(data.phone || "").trim().slice(0, 50);
  const program = String(data.program || "Belirtilmedi").trim().slice(0, 160);
  const message = String(data.message || "").trim().slice(0, 4000);
  const language = data.language === "en" ? "en" : "tr";
  const website = String(data.website || "").trim();

  if (website) return Response.json({ ok: true });
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ ok: false, message: "Ad soyad ve geçerli bir e-posta adresi gereklidir." }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  const from = "Eğitim Enstitüsü <info@eenstitu.com>";

  const notification = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from,
      to: ["info@eenstitu.com"],
      reply_to: email,
      subject: `Web Sitesi Başvurusu · ${program}`,
      html: `<h2>Yeni web sitesi başvurusu</h2><p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p><p><strong>E-posta:</strong> ${escapeHtml(email)}</p><p><strong>Telefon:</strong> ${escapeHtml(phone || "Belirtilmedi")}</p><p><strong>Program:</strong> ${escapeHtml(program)}</p><p><strong>Mesaj:</strong></p><p>${escapeHtml(message || "Mesaj bırakılmadı").replaceAll("\n", "<br>")}</p>`,
    }),
  });

  if (!notification.ok) {
    return Response.json({ ok: false, message: "Mesaj şu anda gönderilemedi. Lütfen WhatsApp üzerinden bize ulaşın." }, { status: 502 });
  }

  const acknowledgement = language === "en"
    ? { subject: "We received your application", heading: "Thank you for contacting us.", body: "Your application has reached the Education Institute. Our team will contact you during business hours." }
    : { subject: "Başvurunuzu aldık", heading: "Bizimle iletişime geçtiğiniz için teşekkür ederiz.", body: "Başvurunuz Eğitim Enstitüsü ekibine ulaştı. Çalışma saatleri içinde sizinle iletişime geçeceğiz." };

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: "info@eenstitu.com",
      subject: acknowledgement.subject,
      html: `<h2>${acknowledgement.heading}</h2><p>${acknowledgement.body}</p><p><strong>${escapeHtml(program)}</strong></p><p>Eğitim Enstitüsü<br>+90 505 505 34 20</p>`,
    }),
  });

  return Response.json({ ok: true });
}

async function authenticatedEmail(request: Request, env: Env) {
  await ensureAdminDb(env);
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)eenstitu_admin=([^;]+)/)?.[1];
  if (!cookie || !env.SESSION_SECRET) return null;
  const [id, signature] = cookie.split(".");
  if (!id || !signature || signature !== await hmac(id, env.SESSION_SECRET)) return null;
  const session = await env.DB.prepare("SELECT email,expires_at FROM admin_sessions WHERE id=?").bind(id).first<{email:string; expires_at:number}>();
  return session && session.expires_at > Date.now() && ADMIN_EMAILS.has(session.email) ? session.email : null;
}

async function handleAdminLogin(request: Request, env: Env) {
  if (!validOrigin(request) || authRateLimited(request, "login", 8)) return jsonError("Çok sayıda deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.", 429);
  const data = await request.json().catch(() => null) as { email?: string; passwordProof?: string } | null;
  const email = String(data?.email || "").trim().toLowerCase(); const passwordProof = String(data?.passwordProof || "");
  await ensureAdminDb(env);
  const account = ADMIN_EMAILS.has(email) ? await env.DB.prepare("SELECT password_hash FROM admin_credentials WHERE email=?").bind(email).first<{password_hash:string}>() : null;
  if (!account || !validPasswordProof(passwordProof) || !env.SESSION_SECRET || account.password_hash !== await hmac(passwordProof, env.SESSION_SECRET)) return jsonError("E-posta veya şifre doğru değil.", 401);
  const id = randomToken(); const expires = Date.now() + 8 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO admin_sessions (id,email,expires_at) VALUES (?,?,?)").bind(id,email,expires).run();
  const signature = await hmac(id, env.SESSION_SECRET);
  return Response.json({ ok:true, email }, { headers: { "Set-Cookie": `${AUTH_COOKIE}=${id}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` } });
}

async function handlePasswordResetRequest(request: Request, env: Env) {
  if (!validOrigin(request) || authRateLimited(request, "reset-request", 3)) return Response.json({ ok:true });
  const data = await request.json().catch(() => null) as { email?:string } | null;
  const email = String(data?.email || "").trim().toLowerCase();
  await ensureAdminDb(env);
  if (!ADMIN_EMAILS.has(email) || !env.RESEND_API_KEY) return Response.json({ ok:true });
  const token = randomToken(); const tokenHash = await sha256(token); const expires = Date.now() + 30 * 60 * 1000;
  await env.DB.prepare("DELETE FROM password_reset_tokens WHERE email=? OR expires_at<?").bind(email, Date.now()).run();
  await env.DB.prepare("INSERT INTO password_reset_tokens (token_hash,email,expires_at,used_at) VALUES (?,?,?,NULL)").bind(tokenHash,email,expires).run();
  const resetUrl = `https://eenstitu.com/admin?reset=${encodeURIComponent(token)}`;
  await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${env.RESEND_API_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ from:"Eğitim Enstitüsü <info@eenstitu.com>", to:[email], subject:"Eğitim Enstitüsü yönetim paneli şifre bağlantısı", html:`<h2>Şifre oluşturma / yenileme</h2><p>Yönetim paneli şifrenizi değiştirmek için aşağıdaki bağlantıyı 30 dakika içinde kullanın.</p><p><a href="${resetUrl}">Şifremi oluştur veya yenile</a></p><p>Bu talebi siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.</p>` }) });
  return Response.json({ ok:true });
}

async function handlePasswordReset(request: Request, env: Env) {
  if (!validOrigin(request) || authRateLimited(request, "reset-submit", 5)) return jsonError("Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra yeniden deneyin.",429);
  const data = await request.json().catch(() => null) as { token?:string; passwordProof?:string } | null; const token=String(data?.token||""); const passwordProof=String(data?.passwordProof||"");
  if (!validPasswordProof(passwordProof)) return jsonError("Şifre doğrulaması tamamlanamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
  if (!env.SESSION_SECRET) return jsonError("Şifre hizmeti şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.", 503);
  await ensureAdminDb(env); const tokenHash=await sha256(token); const reset=await env.DB.prepare("SELECT email,expires_at,used_at FROM password_reset_tokens WHERE token_hash=?").bind(tokenHash).first<{email:string;expires_at:number;used_at:number|null}>();
  if (!reset || reset.used_at || reset.expires_at < Date.now() || !ADMIN_EMAILS.has(reset.email)) return jsonError("Bu bağlantı geçersiz veya süresi dolmuş.",400);
  await env.DB.batch([env.DB.prepare("UPDATE admin_credentials SET password_hash=?,updated_at=? WHERE email=?").bind(await hmac(passwordProof, env.SESSION_SECRET),Date.now(),reset.email),env.DB.prepare("UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?").bind(Date.now(),tokenHash),env.DB.prepare("DELETE FROM admin_sessions WHERE email=?").bind(reset.email)]);
  return Response.json({ok:true});
}

function slugify(value:string) { return value.toLocaleLowerCase("tr-TR").replaceAll("ı","i").replaceAll("ş","s").replaceAll("ğ","g").replaceAll("ü","u").replaceAll("ö","o").replaceAll("ç","c").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,90); }
async function handleAdminRecords(request:Request, env:Env) {
  const email=await authenticatedEmail(request,env); if(!email) return jsonError("Oturum gerekli.",401);
  if(request.method==="GET") { const rows=await env.DB.prepare("SELECT slug,title,subtitle,graduates_json,note,certificate_url,certificate_label,created_at,updated_at FROM verification_records ORDER BY updated_at DESC").all(); return Response.json({ok:true,records:rows.results}); }
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  const data=await request.json().catch(()=>null) as {record?:Record<string,unknown>}|null; const r=data?.record||{}; const title=String(r.title||"").trim().slice(0,180); const rawSlug=String(r.slug||"").trim(); const slug=slugify(rawSlug||title); const graduates=Array.isArray(r.graduates)?r.graduates.map(x=>String(x).trim()).filter(Boolean).slice(0,500):[];
  if(!slug || !title) return jsonError("Grup adı ve bağlantı adı gereklidir."); const now=Date.now();
  await env.DB.prepare("INSERT INTO verification_records (slug,title,subtitle,graduates_json,note,certificate_url,certificate_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,graduates_json=excluded.graduates_json,note=excluded.note,certificate_url=excluded.certificate_url,certificate_label=excluded.certificate_label,updated_at=excluded.updated_at").bind(slug,title,String(r.subtitle||"").trim().slice(0,400)||null,JSON.stringify(graduates),String(r.note||"").trim().slice(0,1200)||null,String(r.certificateUrl||"").trim().slice(0,400)||null,String(r.certificateLabel||"").trim().slice(0,180)||null,now,now).run();
  return Response.json({ok:true,slug,url:`${new URL(request.url).origin}/${encodeURIComponent(slug)}`});
}

async function handleVerification(request:Request, env:Env) {
  await ensureAdminDb(env); const slug=decodeURIComponent(new URL(request.url).searchParams.get("slug")||"");
  const record=await env.DB.prepare("SELECT slug,title,subtitle,graduates_json,note,certificate_url,certificate_label FROM verification_records WHERE slug=?").bind(slug).first();
  if(!record) return jsonError("Kayıt bulunamadı.",404); return Response.json({ok:true,record});
}

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function seoResponse(request: Request, response: Response) {
  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  const contentType = headers.get("Content-Type") || "";

  if (request.method === "GET" && contentType.includes("text/html") && url.hostname === "eenstitu.com") {
    headers.set("Link", `<https://eenstitu.com${url.pathname}>; rel="canonical"`);
  }

  if (url.pathname === "/admin" || url.pathname.startsWith("/api/")) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function robotsTxt() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: https://eenstitu.com/sitemap.xml\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

function sitemapXml() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const pages = [
    ["/", "weekly", "1.0"],
    ["/programlar", "weekly", "0.9"],
    ["/iletisim", "monthly", "0.7"],
    ["/instagram", "weekly", "0.6"],
  ];
  const urls = pages.map(([path, changefreq, priority]) => `<url><loc>https://eenstitu.com${path}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;

    if (url.hostname === "www.eenstitu.com") {
      const canonical = new URL(request.url);
      canonical.protocol = "https:";
      canonical.hostname = "eenstitu.com";
      return Response.redirect(canonical.toString(), 301);
    } else if (url.pathname === "/robots.txt") {
      response = robotsTxt();
    } else if (url.pathname === "/sitemap.xml") {
      response = sitemapXml();
    } else if (url.pathname === "/api/contact") {
      response = request.method === "POST"
        ? await handleContactForm(request, env)
        : new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
    } else if (url.pathname === "/api/admin/session") {
      const email = await authenticatedEmail(request, env); response = Response.json({ ok: true, email });
    } else if (url.pathname === "/api/admin/login") {
      response = request.method === "POST" ? await handleAdminLogin(request, env) : new Response("Method Not Allowed", { status: 405 });
    } else if (url.pathname === "/api/admin/request-password-reset") {
      response = request.method === "POST" ? await handlePasswordResetRequest(request, env) : new Response("Method Not Allowed", { status: 405 });
    } else if (url.pathname === "/api/admin/reset-password") {
      response = request.method === "POST" ? await handlePasswordReset(request, env) : new Response("Method Not Allowed", { status: 405 });
    } else if (url.pathname === "/api/admin/records") {
      response = ["GET", "POST"].includes(request.method) ? await handleAdminRecords(request, env) : new Response("Method Not Allowed", { status: 405, headers:{Allow:"GET, POST"} });
    } else if (url.pathname === "/api/verification") {
      response = request.method === "GET" ? await handleVerification(request, env) : new Response("Method Not Allowed", { status: 405, headers:{Allow:"GET"} });
    } else if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    } else {
      response = await handler.fetch(request, env, ctx);
    }

    return withSecurityHeaders(seoResponse(request, response));
  },
};

export default worker;
