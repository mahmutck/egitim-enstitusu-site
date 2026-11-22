/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { CertificateSettings, parseCertificateSettings, sanitizeCertificateSettings } from "../app/certificates/settings";
import { certificateKey } from "../app/certificates/key";

interface CertificateStore {
  get(key: string, options: { type: "stream" }): Promise<ReadableStream | null>;
  put(key: string, value: ArrayBuffer, options?: { metadata?: Record<string, unknown> }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CERTIFICATES?: CertificateStore;
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
    env.DB.prepare("CREATE TABLE IF NOT EXISTS certificate_settings (slug TEXT PRIMARY KEY, settings_json TEXT NOT NULL, updated_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS certificate_files (slug TEXT NOT NULL, name_key TEXT NOT NULL, display_name TEXT NOT NULL, original_name TEXT, pdf_size INTEGER NOT NULL, has_preview INTEGER NOT NULL DEFAULT 0, version TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (slug, name_key))"),
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
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Form bilgileri okunamadı.");
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
  await env.DB.batch([env.DB.prepare("INSERT INTO admin_credentials (email,password_hash,updated_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at").bind(reset.email,await hmac(passwordProof, env.SESSION_SECRET),Date.now()),env.DB.prepare("UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?").bind(Date.now(),tokenHash),env.DB.prepare("DELETE FROM admin_sessions WHERE email=?").bind(reset.email)]);
  return Response.json({ok:true});
}

function slugify(value:string) { return value.toLocaleLowerCase("tr-TR").replaceAll("ı","i").replaceAll("ş","s").replaceAll("ğ","g").replaceAll("ü","u").replaceAll("ö","o").replaceAll("ç","c").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,90); }
async function handleAdminRecords(request:Request, env:Env) {
  const email=await authenticatedEmail(request,env); if(!email) return jsonError("Oturum gerekli.",401);
  if(request.method==="GET") {
    const rows=await env.DB.prepare("SELECT slug,title,subtitle,graduates_json,note,certificate_url,certificate_label,created_at,updated_at FROM verification_records ORDER BY updated_at DESC").all<Record<string,unknown>>();
    const files=await env.DB.prepare("SELECT slug,name_key,original_name,pdf_size,has_preview,version FROM certificate_files").all<CertificateRow>();
    const bySlug=new Map<string,CertificateRow[]>();
    for(const row of files.results) bySlug.set(row.slug,[...(bySlug.get(row.slug)||[]),row]);
    const settings=await env.DB.prepare("SELECT slug,settings_json FROM certificate_settings").all<{slug:string;settings_json:string}>();
    const settingsBySlug=new Map(settings.results.map(row=>[row.slug,row.settings_json]));
    const records=rows.results.map(record=>{
      const slug=String(record.slug); const graduatesJson=String(record.graduates_json||"[]"); const graduates=parseGraduates(graduatesJson);
      return {...record,certificates:certificatesFor(slug,graduatesJson,bySlug.get(slug)||[]),certificate_settings:parseCertificateSettings(settingsBySlug.get(slug),graduates),participant_keys:Object.fromEntries(graduates.map(name=>[name,certificateKey(name)]))};
    });
    return Response.json({ok:true,records,storageReady:Boolean(env.CERTIFICATES)});
  }
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  const data=await request.json().catch(()=>null) as {record?:Record<string,unknown>}|null; const r=data?.record||{}; const title=String(r.title||"").trim().slice(0,180); const rawSlug=String(r.slug||"").trim(); const slug=slugify(rawSlug||title); const graduates=Array.isArray(r.graduates)?r.graduates.map(x=>String(x).trim()).filter(Boolean).slice(0,500):[];
  if(!slug || !title) return jsonError("Grup adı ve bağlantı adı gereklidir."); const now=Date.now();
  await env.DB.prepare("INSERT INTO verification_records (slug,title,subtitle,graduates_json,note,certificate_url,certificate_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,graduates_json=excluded.graduates_json,note=excluded.note,certificate_url=excluded.certificate_url,certificate_label=excluded.certificate_label,updated_at=excluded.updated_at").bind(slug,title,String(r.subtitle||"").trim().slice(0,400)||null,JSON.stringify(graduates),String(r.note||"").trim().slice(0,1200)||null,String(r.certificateUrl||"").trim().slice(0,400)||null,String(r.certificateLabel||"").trim().slice(0,180)||null,now,now).run();
  return Response.json({ok:true,slug,url:`${new URL(request.url).origin}/${encodeURIComponent(slug)}`});
}

async function handleVerification(request:Request, env:Env) {
  await ensureAdminDb(env); const rawSlug=new URL(request.url).searchParams.get("slug")||""; const slug=rawSlug==="egitim-enstitusu1"?"eğitim-enstitüsü1":rawSlug;
  const record=await env.DB.prepare("SELECT slug,title,subtitle,graduates_json,note,certificate_url,certificate_label FROM verification_records WHERE slug=?").bind(slug).first<Record<string,unknown>>();
  if(!record) return jsonError("Kayıt bulunamadı.",404);
  // Certificates are visible to the administrators only; everyone else gets the participant list.
  if(!await authenticatedEmail(request,env)) return Response.json({ok:true,record:{...record,admin:false,generated:null,certificates:{}}},{headers:{"Cache-Control":"private, no-store"}});
  const files=await env.DB.prepare("SELECT slug,name_key,original_name,pdf_size,has_preview,version FROM certificate_files WHERE slug=?").bind(String(record.slug)).all<CertificateRow>();
  const settingsRow=await env.DB.prepare("SELECT settings_json FROM certificate_settings WHERE slug=?").bind(String(record.slug)).first<{settings_json:string}>();
  const graduatesJson=String(record.graduates_json||"[]");
  const settings=parseCertificateSettings(settingsRow?.settings_json,parseGraduates(graduatesJson));
  const generated=settings?.enabled?{tr:settings.tr,en:settings.en,date:settings.date}:null;
  return Response.json({ok:true,record:{...record,admin:true,generated,certificates:certificatesFor(String(record.slug),graduatesJson,files.results,settings)}},{headers:{"Cache-Control":"private, no-store"}});
}

// Participant certificates: PDF + optional JPEG preview in KV, current version in D1.
type CertificateRow={slug:string;name_key:string;original_name:string|null;pdf_size:number;has_preview:number;version:string};
const MAX_CERTIFICATE_PDF=24*1024*1024;
const MAX_CERTIFICATE_PREVIEW=4*1024*1024;

function certificateStorageKey(slug:string, key:string, version:string, ext:"pdf"|"jpg") { return `certificates/${slug}/${key}/${version}.${ext}`; }
function certificateUrl(slug:string, key:string, version:string, ext:"pdf"|"jpg") { return `/sertifika/${encodeURIComponent(slug)}/${key}.${ext}?v=${version}`; }
function parseGraduates(json:string) { try { const list=JSON.parse(json); return Array.isArray(list)?list.map(item=>String(item)):[]; } catch { return []; } }

type CertificateEntry={key:string;pdf:string;preview:string|null;size:number;originalName:string|null}|{key:string;generated:true;serial:string};

/** Uploaded PDFs win; with generation enabled every other participant gets a generated certificate. */
function certificatesFor(slug:string, graduatesJson:string, rows:CertificateRow[], settings?:CertificateSettings|null) {
  const byKey=new Map(rows.map(row=>[row.name_key,row]));
  const result:Record<string,CertificateEntry>={};
  for(const name of parseGraduates(graduatesJson)) {
    const key=certificateKey(name); const row=byKey.get(key);
    if(row) result[name]={key,pdf:certificateUrl(slug,key,row.version,"pdf"),preview:row.has_preview?certificateUrl(slug,key,row.version,"jpg"):null,size:row.pdf_size,originalName:row.original_name};
    else if(settings?.enabled) result[name]={key,generated:true,serial:settings.serials[name]||""};
  }
  return result;
}

async function handleCertificateSettings(request:Request, env:Env) {
  const email=await authenticatedEmail(request,env); if(!email) return jsonError("Oturum gerekli.",401);
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  const data=await request.json().catch(()=>null) as {slug?:string;settings?:unknown}|null;
  const slug=String(data?.slug||"").trim();
  const record=slug?await env.DB.prepare("SELECT graduates_json FROM verification_records WHERE slug=?").bind(slug).first<{graduates_json:string}>():null;
  if(!record) return jsonError("Kayıt bulunamadı.",404);
  const settings=sanitizeCertificateSettings(data?.settings,parseGraduates(record.graduates_json));
  if(settings.enabled && (!settings.tr.length || !settings.en.length)) return jsonError("Türkçe ve İngilizce sertifika metni gereklidir.");
  await env.DB.prepare("INSERT INTO certificate_settings (slug,settings_json,updated_at) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET settings_json=excluded.settings_json,updated_at=excluded.updated_at").bind(slug,JSON.stringify(settings),Date.now()).run();
  return Response.json({ok:true,settings});
}

function startsWith(bytes:Uint8Array, signature:number[]) { return signature.every((value,index)=>bytes[index]===value); }

async function graduateInRecord(env:Env, slug:string, name:string) {
  const record=await env.DB.prepare("SELECT graduates_json FROM verification_records WHERE slug=?").bind(slug).first<{graduates_json:string}>();
  return Boolean(record && parseGraduates(record.graduates_json).includes(name));
}

async function deleteStoredCertificate(env:Env, row:CertificateRow) {
  if(!env.CERTIFICATES) return;
  await env.CERTIFICATES.delete(certificateStorageKey(row.slug,row.name_key,row.version,"pdf"));
  if(row.has_preview) await env.CERTIFICATES.delete(certificateStorageKey(row.slug,row.name_key,row.version,"jpg"));
}

async function handleCertificateUpload(request:Request, env:Env) {
  const email=await authenticatedEmail(request,env); if(!email) return jsonError("Oturum gerekli.",401);
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  if(!env.CERTIFICATES) return jsonError("Sertifika deposu henüz yapılandırılmadı.",503);
  const form=await request.formData().catch(()=>null);
  if(!form) return jsonError("Dosya okunamadı.");
  const slug=String(form.get("slug")||"").trim(); const name=String(form.get("name")||"").trim();
  const pdf=form.get("pdf"); const preview=form.get("preview");
  if(!slug || !name || !(pdf instanceof File)) return jsonError("Kayıt, katılımcı ve PDF dosyası gereklidir.");
  if(!await graduateInRecord(env,slug,name)) return jsonError("Katılımcı bu kayıtta bulunamadı. Listeyi değiştirdiyseniz önce kaydedin.");
  if(pdf.size===0 || pdf.size>MAX_CERTIFICATE_PDF) return jsonError("PDF en fazla 24 MB olabilir.");
  const pdfBytes=await pdf.arrayBuffer();
  if(!startsWith(new Uint8Array(pdfBytes,0,Math.min(5,pdfBytes.byteLength)),[0x25,0x50,0x44,0x46,0x2d])) return jsonError("Yalnızca PDF dosyası yüklenebilir.");
  let previewBytes:ArrayBuffer|null=null;
  if(preview instanceof File && preview.size>0) {
    if(preview.size>MAX_CERTIFICATE_PREVIEW) return jsonError("Önizleme görseli çok büyük.");
    previewBytes=await preview.arrayBuffer();
    if(!startsWith(new Uint8Array(previewBytes,0,Math.min(3,previewBytes.byteLength)),[0xff,0xd8,0xff])) return jsonError("Önizleme görseli JPEG olmalıdır.");
  }
  const key=certificateKey(name); const version=`${Date.now().toString(36)}${randomToken().slice(0,6)}`.toLowerCase().replace(/[^a-z0-9]/g,"");
  const previous=await env.DB.prepare("SELECT slug,name_key,original_name,pdf_size,has_preview,version FROM certificate_files WHERE slug=? AND name_key=?").bind(slug,key).first<CertificateRow>();
  await env.CERTIFICATES.put(certificateStorageKey(slug,key,version,"pdf"),pdfBytes,{metadata:{name,uploadedBy:email}});
  if(previewBytes) await env.CERTIFICATES.put(certificateStorageKey(slug,key,version,"jpg"),previewBytes,{metadata:{name}});
  await env.DB.prepare("INSERT INTO certificate_files (slug,name_key,display_name,original_name,pdf_size,has_preview,version,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(slug,name_key) DO UPDATE SET display_name=excluded.display_name,original_name=excluded.original_name,pdf_size=excluded.pdf_size,has_preview=excluded.has_preview,version=excluded.version,updated_at=excluded.updated_at").bind(slug,key,name,pdf.name.slice(0,200)||null,pdf.size,previewBytes?1:0,version,Date.now()).run();
  if(previous && previous.version!==version) await deleteStoredCertificate(env,previous);
  return Response.json({ok:true,certificate:{key,pdf:certificateUrl(slug,key,version,"pdf"),preview:previewBytes?certificateUrl(slug,key,version,"jpg"):null,size:pdf.size,originalName:pdf.name||null}});
}

async function handleCertificateDelete(request:Request, env:Env) {
  const email=await authenticatedEmail(request,env); if(!email) return jsonError("Oturum gerekli.",401);
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  const data=await request.json().catch(()=>null) as {slug?:string;name?:string}|null;
  const slug=String(data?.slug||"").trim(); const key=certificateKey(String(data?.name||"").trim());
  const row=await env.DB.prepare("SELECT slug,name_key,original_name,pdf_size,has_preview,version FROM certificate_files WHERE slug=? AND name_key=?").bind(slug,key).first<CertificateRow>();
  if(!row) return jsonError("Sertifika bulunamadı.",404);
  await env.DB.prepare("DELETE FROM certificate_files WHERE slug=? AND name_key=?").bind(slug,key).run();
  await deleteStoredCertificate(env,row);
  return Response.json({ok:true});
}

function contentDisposition(type:"inline"|"attachment", filename:string) {
  const ascii=filename.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ı/g,"i").replace(/İ/g,"I").replace(/[^A-Za-z0-9 ._-]/g,"_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function serveCertificateFile(request:Request, env:Env, slug:string, key:string, ext:"pdf"|"jpg") {
  if(!["GET","HEAD"].includes(request.method)) return new Response("Method Not Allowed",{status:405,headers:{Allow:"GET, HEAD"}});
  if(!await authenticatedEmail(request,env)) return new Response("Sertifika bulunamadı.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  const row=await env.DB.prepare("SELECT slug,name_key,display_name,has_preview,version FROM certificate_files WHERE slug=? AND name_key=?").bind(slug,key).first<CertificateRow & {display_name:string}>();
  if(!row || !env.CERTIFICATES || (ext==="jpg" && !row.has_preview)) return new Response("Sertifika bulunamadı.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  const body=await env.CERTIFICATES.get(certificateStorageKey(slug,key,row.version,ext),{type:"stream"});
  if(!body) return new Response("Sertifika bulunamadı.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  const url=new URL(request.url); const current=url.searchParams.get("v")===row.version;
  const headers=new Headers({
    "Content-Type": ext==="pdf" ? "application/pdf" : "image/jpeg",
    "Cache-Control": current ? "private, max-age=86400" : "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  if(ext==="pdf") headers.set("Content-Disposition",contentDisposition(url.searchParams.has("indir")?"attachment":"inline",`${row.display_name.split(" · ")[0]} - Sertifika.pdf`));
  if(request.method==="HEAD") { await body.cancel(); return new Response(null,{headers}); }
  return new Response(body,{headers});
}

function withSecurityHeaders(response: Response, allowSameOriginFrame = false) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", allowSameOriginFrame ? "SAMEORIGIN" : "DENY");
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
    const certificateFileMatch = url.pathname.match(/^\/sertifika\/([^/]+)\/([a-z0-9-]+)\.(pdf|jpg)$/);
    let response: Response;

    if (url.hostname === "www.eenstitu.com" || (url.hostname === "eenstitu.com" && url.protocol === "http:")) {
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
    } else if (url.pathname === "/api/admin/certificate-settings") {
      response = request.method === "POST" ? await handleCertificateSettings(request, env) : new Response("Method Not Allowed", { status: 405, headers:{Allow:"POST"} });
    } else if (url.pathname === "/api/admin/certificates") {
      response = request.method === "POST" ? await handleCertificateUpload(request, env)
        : request.method === "DELETE" ? await handleCertificateDelete(request, env)
        : new Response("Method Not Allowed", { status: 405, headers:{Allow:"POST, DELETE"} });
    } else if (certificateFileMatch) {
      let slug = certificateFileMatch[1];
      try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
      response = await serveCertificateFile(request, env, slug, certificateFileMatch[2], certificateFileMatch[3] as "pdf" | "jpg");
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

    return withSecurityHeaders(seoResponse(request, response), Boolean(certificateFileMatch));
  },
};

export default worker;
