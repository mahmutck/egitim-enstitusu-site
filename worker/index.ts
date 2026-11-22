/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { applyTrainingRange, assignMissingSerials, CertificateSettings, DEFAULT_CERTIFICATE_SETTINGS, formatTrainingRange, isIsoDate, parseCertificateSettings, participantSerial, recordGroupNumber, sanitizeCertificateSettings } from "../app/certificates/settings";
import { BASE_PDF_PATH, buildCertificatePdf } from "./certificate-pdf";
import { certificateKey } from "../app/certificates/key";

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
    env.DB.prepare("CREATE TABLE IF NOT EXISTS certificate_links (token TEXT PRIMARY KEY, slug TEXT NOT NULL, name_key TEXT NOT NULL, display_name TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE (slug, name_key))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS training_dates (slug TEXT PRIMARY KEY, start_date TEXT NOT NULL, end_date TEXT NOT NULL, updated_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS certificate_settings (slug TEXT PRIMARY KEY, settings_json TEXT NOT NULL, updated_at INTEGER NOT NULL)"),
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
    const rows=await env.DB.prepare("SELECT v.slug,v.title,v.subtitle,v.graduates_json,v.note,v.certificate_url,v.certificate_label,v.created_at,v.updated_at,t.start_date AS training_start,t.end_date AS training_end FROM verification_records v LEFT JOIN training_dates t ON t.slug=v.slug ORDER BY v.updated_at DESC").all<Record<string,unknown>>();
    const settings=await env.DB.prepare("SELECT slug,settings_json FROM certificate_settings").all<{slug:string;settings_json:string}>();
    const settingsBySlug=new Map(settings.results.map(row=>[row.slug,row.settings_json]));
    const records=[];
    for(const record of rows.results) {
      const slug=String(record.slug); const graduates=parseGraduates(String(record.graduates_json||"[]"));
      const certificateLinks=await ensureCertificateLinks(env,slug,graduates);
      const settings=await certificateSettingsFor(env,slug,String(record.title||""),graduates,settingsBySlug.get(slug));
      records.push({...record,certificate_links:certificateLinks,training_range:formatTrainingRange(record.training_start as string|null,record.training_end as string|null),certificate_settings:sanitizeCertificateSettings(settings,graduates)});
    }
    return Response.json({ok:true,records});
  }
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  const data=await request.json().catch(()=>null) as {record?:Record<string,unknown>}|null; const r=data?.record||{}; const title=String(r.title||"").trim().slice(0,180); const rawSlug=String(r.slug||"").trim(); const slug=slugify(rawSlug||title); const graduates=Array.isArray(r.graduates)?r.graduates.map(x=>String(x).trim()).filter(Boolean).slice(0,500):[];
  if(!slug || !title) return jsonError("Grup adı ve bağlantı adı gereklidir."); const now=Date.now();
  const startInput=String(r.trainingStart||"").trim(); const endInput=String(r.trainingEnd||"").trim();
  if((startInput && !isIsoDate(startInput)) || (endInput && !isIsoDate(endInput))) return jsonError("Geçerli bir eğitim tarih aralığı seçin.");
  await env.DB.prepare("INSERT INTO verification_records (slug,title,subtitle,graduates_json,note,certificate_url,certificate_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,graduates_json=excluded.graduates_json,note=excluded.note,certificate_url=excluded.certificate_url,certificate_label=excluded.certificate_label,updated_at=excluded.updated_at").bind(slug,title,String(r.subtitle||"").trim().slice(0,400)||null,JSON.stringify(graduates),String(r.note||"").trim().slice(0,1200)||null,String(r.certificateUrl||"").trim().slice(0,400)||null,String(r.certificateLabel||"").trim().slice(0,180)||null,now,now).run();
  if(!startInput && !endInput) await env.DB.prepare("DELETE FROM training_dates WHERE slug=?").bind(slug).run();
  else {
    let start=startInput||endInput; let end=endInput||startInput; if(end<start) [start,end]=[end,start];
    await env.DB.prepare("INSERT INTO training_dates (slug,start_date,end_date,updated_at) VALUES (?,?,?,?) ON CONFLICT(slug) DO UPDATE SET start_date=excluded.start_date,end_date=excluded.end_date,updated_at=excluded.updated_at").bind(slug,start,end,now).run();
  }
  return Response.json({ok:true,slug,url:`${new URL(request.url).origin}/${encodeURIComponent(slug)}`});
}

async function handleVerification(request:Request, env:Env) {
  await ensureAdminDb(env); const rawSlug=new URL(request.url).searchParams.get("slug")||""; const slug=rawSlug==="egitim-enstitusu1"?"eğitim-enstitüsü1":rawSlug;
  const row=await env.DB.prepare("SELECT v.slug,v.title,v.subtitle,v.graduates_json,v.note,v.certificate_url,v.certificate_label,t.start_date AS training_start,t.end_date AS training_end FROM verification_records v LEFT JOIN training_dates t ON t.slug=v.slug WHERE v.slug=?").bind(slug).first<Record<string,unknown>>();
  if(!row) return jsonError("Kayıt bulunamadı.",404);
  const record={...row,training_range:formatTrainingRange(row.training_start as string|null,row.training_end as string|null)};
  // Certificates are visible to the administrators only; everyone else gets the participant list.
  if(!await authenticatedEmail(request,env)) return Response.json({ok:true,record:{...record,admin:false,certificates:{}}},{headers:{"Cache-Control":"private, no-store"}});
  const graduates=parseGraduates(String(record.graduates_json||"[]"));
  const links=await ensureCertificateLinks(env,String(record.slug),graduates);
  return Response.json({ok:true,record:{...record,admin:true,certificates:Object.fromEntries(Object.entries(links).map(([name,token])=>[name,{token,url:`/sertifika/${token}`}]))}},{headers:{"Cache-Control":"private, no-store"}});
}

function parseGraduates(json:string) { try { const list=JSON.parse(json); return Array.isArray(list)?list.map(item=>String(item)):[]; } catch { return []; } }

// Permanent, unguessable link per participant (QR code target). Created once; never changed or reused.
const CERTIFICATE_LINK_ORIGIN="https://eenstitu.com";
function linkToken() { const bytes=new Uint8Array(12); crypto.getRandomValues(bytes); return base64Url(bytes); }

async function ensureCertificateLinks(env:Env, slug:string, graduates:string[]) {
  const load=async()=>new Map((await env.DB.prepare("SELECT name_key,token FROM certificate_links WHERE slug=?").bind(slug).all<{name_key:string;token:string}>()).results.map(row=>[row.name_key,row.token]));
  let byKey=await load();
  const missing=[...new Set(graduates.map(name=>certificateKey(name)))].filter(key=>!byKey.has(key));
  if(missing.length) {
    const now=Date.now();
    await env.DB.batch(missing.map(key=>env.DB.prepare("INSERT OR IGNORE INTO certificate_links (token,slug,name_key,display_name,created_at) VALUES (?,?,?,?,?)").bind(linkToken(),slug,key,graduates.find(name=>certificateKey(name)===key)||key,now)));
    byKey=await load();
  }
  return Object.fromEntries(graduates.map(name=>[name,byKey.get(certificateKey(name))||""]).filter(([,token])=>token));
}

const SAVE_CERTIFICATE_SETTINGS="INSERT INTO certificate_settings (slug,settings_json,updated_at) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET settings_json=excluded.settings_json,updated_at=excluded.updated_at";

/**
 * Settings of a record with a serial number for every listed participant. Missing numbers are given
 * automatically (group number + position, e.g. HS-ON-1910) and saved at once, so they never change.
 * Numbers of participants no longer listed are kept, so re-adding someone restores their number.
 */
async function certificateSettingsFor(env:Env, slug:string, title:string, graduates:string[], savedJson?:string|null):Promise<CertificateSettings> {
  const saved=parseCertificateSettings(savedJson) ?? {...DEFAULT_CERTIFICATE_SETTINGS,serials:{},names:{}};
  const {settings,changed}=assignMissingSerials(saved,graduates,recordGroupNumber(slug,title));
  if(changed) await env.DB.prepare(SAVE_CERTIFICATE_SETTINGS).bind(slug,JSON.stringify(settings),Date.now()).run();
  return settings;
}

function certificateDate(isoDate:string|null) {
  if(!isoDate || !isIsoDate(isoDate)) return "";
  const [y,m,d]=isoDate.split("-"); return `${d}-${m}-${y}`;
}

/** Certificate contents for a permanent link token, or null when the link is unknown or the participant was removed. */
async function resolveCertificate(env:Env, token:string) {
  if(!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  await ensureAdminDb(env);
  const link=await env.DB.prepare("SELECT slug,name_key FROM certificate_links WHERE token=?").bind(token).first<{slug:string;name_key:string}>();
  if(!link) return null;
  const record=await env.DB.prepare("SELECT v.slug,v.title,v.graduates_json,t.start_date AS training_start,t.end_date AS training_end FROM verification_records v LEFT JOIN training_dates t ON t.slug=v.slug WHERE v.slug=?").bind(link.slug).first<{slug:string;title:string|null;graduates_json:string;training_start:string|null;training_end:string|null}>();
  if(!record) return null;
  const graduates=parseGraduates(record.graduates_json);
  const listed=graduates.find(item=>certificateKey(item)===link.name_key);
  if(!listed) return null;
  const settingsRow=await env.DB.prepare("SELECT settings_json FROM certificate_settings WHERE slug=?").bind(link.slug).first<{settings_json:string}>();
  const settings=await certificateSettingsFor(env,link.slug,record.title||"",graduates,settingsRow?.settings_json);
  const range=formatTrainingRange(record.training_start,record.training_end);
  return {
    name:settings.names[listed]||listed.split(" · ")[0].trim(),
    serial:participantSerial(settings,listed),
    date:settings.date||certificateDate(record.training_end||record.training_start),
    tr:applyTrainingRange(settings.tr,range),
    en:applyTrainingRange(settings.en,range),
    url:`${CERTIFICATE_LINK_ORIGIN}/sertifika/${token}`,
  };
}

function contentDisposition(type:"inline"|"attachment", filename:string) {
  const ascii=filename.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/İ/g,"I").replace(/[^A-Za-z0-9 ._-]/g,"_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** /sertifika/<token>: the certificate PDF itself (QR code target). ?indir=1 downloads it. */
async function handleCertificatePdf(request:Request, env:Env, token:string) {
  if(!["GET","HEAD"].includes(request.method)) return new Response("Method Not Allowed",{status:405,headers:{Allow:"GET, HEAD"}});
  const certificate=await resolveCertificate(env,token);
  if(!certificate) return new Response("Sertifika bulunamadı veya artık geçerli değil.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
  const baseResponse=await env.ASSETS.fetch(new Request(new URL(BASE_PDF_PATH,request.url)));
  if(!baseResponse.ok) return new Response("Sertifika şu anda oluşturulamıyor.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  const pdf=buildCertificatePdf(await baseResponse.arrayBuffer(),certificate);
  const disposition=new URL(request.url).searchParams.has("indir")?"attachment":"inline";
  const headers={"Content-Type":"application/pdf","Content-Disposition":contentDisposition(disposition,`${certificate.name} - Sertifika.pdf`),"Content-Length":String(pdf.size),"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"};
  return new Response(request.method==="HEAD"?null:pdf,{headers});
}

async function handleCertificateSettings(request:Request, env:Env) {
  const email=await authenticatedEmail(request,env); if(!email) return jsonError("Oturum gerekli.",401);
  if(!validOrigin(request)) return jsonError("Geçersiz istek kaynağı.",403);
  const data=await request.json().catch(()=>null) as {slug?:string;settings?:unknown}|null;
  const slug=String(data?.slug||"").trim();
  const record=slug?await env.DB.prepare("SELECT title,graduates_json FROM verification_records WHERE slug=?").bind(slug).first<{title:string|null;graduates_json:string}>():null;
  if(!record) return jsonError("Kayıt bulunamadı.",404);
  const graduates=parseGraduates(record.graduates_json);
  const settings=sanitizeCertificateSettings(data?.settings,graduates);
  if(!settings.tr.length || !settings.en.length) return jsonError("Türkçe ve İngilizce sertifika metni gereklidir.");
  // Keep the numbers of participants who are not listed right now (restored if they are added back).
  const stored=await env.DB.prepare("SELECT settings_json FROM certificate_settings WHERE slug=?").bind(slug).first<{settings_json:string}>();
  const listed=new Set(graduates);
  const kept=Object.fromEntries(Object.entries(parseCertificateSettings(stored?.settings_json)?.serials||{}).filter(([name])=>!listed.has(name)));
  // A participant whose number was cleared gets the next one right away.
  const complete=assignMissingSerials({...settings,serials:{...kept,...settings.serials}},graduates,recordGroupNumber(slug,record.title||"")).settings;
  await env.DB.prepare(SAVE_CERTIFICATE_SETTINGS).bind(slug,JSON.stringify(complete),Date.now()).run();
  return Response.json({ok:true,settings:sanitizeCertificateSettings(complete,graduates)});
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

  if (url.pathname === "/admin" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/sertifika/")) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function robotsTxt() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /sertifika/\n\nSitemap: https://eenstitu.com/sitemap.xml\n", {
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
    const certificateMatch = url.pathname.match(/^\/sertifika\/([A-Za-z0-9_-]{16,64})$/);
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
    } else if (certificateMatch) {
      response = await handleCertificatePdf(request, env, certificateMatch[1]);
    } else if (url.pathname === "/api/admin/certificate-settings") {
      response = request.method === "POST" ? await handleCertificateSettings(request, env) : new Response("Method Not Allowed", { status: 405, headers:{Allow:"POST"} });
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
