import assert from "node:assert/strict";
import test from "node:test";

const { default: worker } = await import("../dist/server/index.js");
const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  DB: {
    prepare(sql) {
      assert.match(sql, /^(CREATE (TABLE|INDEX) IF NOT EXISTS |INSERT OR IGNORE INTO verification_records )/, "Unauthenticated requests must not query protected records");
      return { bind() { return { async run() { return {}; } }; } };
    },
    async batch() { return []; },
  },
};
const context = { waitUntil() {}, passThroughOnException() {} };
const request = (path, hostname = "eenstitu.com") => worker.fetch(
  new Request(`https://${hostname}${path}`, { headers: { accept: "text/html" } }), env, context,
);

test("renders the current institute homepage and faculty", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.match(html, /Psikolojik Araştırmalar Enstitüsü/);
  assert.match(html, /Biosomatik/);
  assert.match(html, /Hipnosomatik/);
  assert.match(html, /images\/faculty\/ahmet-demir\.jpg/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/);
});

test("redirects www to the canonical domain while retaining the URL", async () => {
  const response = await request("/programlar?lang=en", "www.eenstitu.com");
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://eenstitu.com/programlar?lang=en");
});

test("protects administrator records and rejects form GET requests", async () => {
  const response = await request("/api/admin/records");
  assert.equal(response.status, 401);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  const form = await request("/api/contact");
  assert.equal(form.status, 405);
  assert.equal(form.headers.get("allow"), "POST");
});

test("first password setup, login, session and reset token reuse", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  const testEnv = { ...env, SESSION_SECRET: "test-only-not-a-production-secret", DB: {
    prepare(sql) { let values=[]; return { bind(...args) { values=args; return this; }, async run() { return db.prepare(sql).run(...values); }, async first() { return db.prepare(sql).get(...values) ?? null; }, async all() { return { results: db.prepare(sql).all(...values) }; }, sql() { return [sql,values]; } }; },
    async batch(statements) { return statements.map(s => { const [sql,args]=s.sql(); return db.prepare(sql).run(...args); }); },
  } };
  const call = (path, body, cookie) => worker.fetch(new Request(`https://eenstitu.com${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type":"application/json", Origin:"https://eenstitu.com", ...(cookie ? {Cookie:cookie} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) }),testEnv,context);
  await call("/api/admin/session");
  const token="isolated-test-reset-token";
  const hash=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("base64url");
  db.prepare("INSERT INTO password_reset_tokens VALUES (?,?,?,NULL)").run(hash,"info@eenstitu.com",Date.now()+60000);
  const proof="A".repeat(43);
  assert.equal((await call("/api/admin/reset-password",{token,passwordProof:proof})).status,200);
  assert.equal(db.prepare("SELECT count(*) AS n FROM admin_credentials").get().n,1);
  const login=await call("/api/admin/login",{email:"info@eenstitu.com",passwordProof:proof});
  assert.equal(login.status,200);
  const cookie=login.headers.get("set-cookie");
  assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await (await call("/api/admin/session",null,cookie)).json()).email,"info@eenstitu.com");
  assert.equal((await call("/api/admin/records",null,cookie)).status,200);
  assert.equal((await call("/api/admin/records",null,cookie.replace("eenstitu_admin=","eenstitu_admin=forged"))).status,401);
  assert.equal((await call("/api/admin/reset-password",{token,passwordProof:proof})).status,400);
  db.close();
});

test("invalid forms and cross-origin requests never send mail", async () => {
  const original=globalThis.fetch; let sent=0;
  globalThis.fetch=async()=>{sent++;throw new Error("Mail must not be sent");};
  try {
    const call=(body,origin="https://eenstitu.com")=>worker.fetch(new Request("https://eenstitu.com/api/contact",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body}),{...env,RESEND_API_KEY:"test-only"},context);
    for (const body of ["null","[]","{}","invalid json"]) assert.equal((await call(body)).status,400);
    assert.equal((await call("{}","https://other.example")).status,403);
    assert.equal(sent,0);
  } finally {globalThis.fetch=original;}
});

test("redirects HTTP to HTTPS before serving content", async () => {
 const response=await worker.fetch(new Request("http://eenstitu.com/iletisim?program=biosomatik"),env,context);
 assert.equal(response.status,301);
 assert.equal(response.headers.get("location"),"https://eenstitu.com/iletisim?program=biosomatik");
});

test("form emails use info sender, correct reply addresses and escaped content", async () => {
 const original=globalThis.fetch; const sent=[];
 globalThis.fetch=async(url,options)=>{ assert.equal(url,"https://api.resend.com/emails");sent.push(JSON.parse(options.body));return Response.json({id:"test-mail"});};
 try {
  const response=await worker.fetch(new Request("https://eenstitu.com/api/contact",{method:"POST",headers:{Origin:"https://eenstitu.com","Content-Type":"application/json","CF-Connecting-IP":"192.0.2.123"},body:JSON.stringify({name:"<script>test</script>",email:"applicant@example.com",message:"<img src=x>",language:"en"})}),{...env,RESEND_API_KEY:"test-only"},context);
  assert.equal(response.status,200);assert.equal(sent.length,2);
  assert.ok(sent.every(mail=>mail.from==="Eğitim Enstitüsü <info@eenstitu.com>"));
  assert.equal(sent[0].reply_to,"applicant@example.com");assert.equal(sent[1].reply_to,"info@eenstitu.com");
  assert.doesNotMatch(sent[0].html,/<script>|<img/);assert.match(sent[0].html,/&lt;script&gt;/);
 } finally {globalThis.fetch=original;}
});

test("training date range: saved with the record, formatted for certificates", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  const testEnv = { ...env, SESSION_SECRET: "test-only-not-a-production-secret", DB: {
    prepare(sql) { let values=[]; return { bind(...args) { values=args; return this; }, async run() { return db.prepare(sql).run(...values); }, async first() { return db.prepare(sql).get(...values) ?? null; }, async all() { return { results: db.prepare(sql).all(...values) }; }, sql() { return [sql,values]; } }; },
    async batch(statements) { return statements.map(s => { const [sql,args]=s.sql(); return db.prepare(sql).run(...args); }); },
  } };
  const send = (path, init = {}) => worker.fetch(new Request(`https://eenstitu.com${path}`, { ...init, headers: { Origin: "https://eenstitu.com", ...(init.headers || {}) } }), testEnv, context);
  const json = (body, cookie) => ({ method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  await send("/api/admin/session");
  const token = "range-test-token";
  db.prepare("INSERT INTO password_reset_tokens VALUES (?,?,?,NULL)").run(Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("base64url"), "info@eenstitu.com", Date.now() + 60000);
  const proof = "D".repeat(43);
  await send("/api/admin/reset-password", json({ token, passwordProof: proof }));
  const cookie = (await send("/api/admin/login", json({ email: "info@eenstitu.com", passwordProof: proof }))).headers.get("set-cookie").split(";")[0];

  const save = (trainingStart, trainingEnd) => send("/api/admin/records", json({ record: { slug: "tarih-testi", title: "Tarih testi", graduates: ["Ali Veli"], trainingStart, trainingEnd } }, cookie));
  const range = async () => (await (await send("/api/verification?slug=tarih-testi")).json()).record.training_range;

  assert.equal((await save("2026-05-15", "2026-05-22")).status, 200);
  assert.deepEqual(await range(), { tr: "15-22 Mayıs 2026", en: "15–22 May 2026" });
  const records = await (await send("/api/admin/records", { headers: { Cookie: cookie } })).json();
  const saved = records.records.find(r => r.slug === "tarih-testi");
  assert.equal(saved.training_start, "2026-05-15"); assert.equal(saved.training_end, "2026-05-22");
  assert.deepEqual(saved.training_range, { tr: "15-22 Mayıs 2026", en: "15–22 May 2026" });

  await save("2026-04-28", "2026-05-03");
  assert.deepEqual(await range(), { tr: "28 Nisan - 3 Mayıs 2026", en: "28 April – 3 May 2026" });
  await save("2025-12-29", "2026-01-02");
  assert.deepEqual(await range(), { tr: "29 Aralık 2025 - 2 Ocak 2026", en: "29 December 2025 – 2 January 2026" });
  await save("2026-07-12", "2026-07-12");
  assert.deepEqual(await range(), { tr: "12 Temmuz 2026", en: "12 July 2026" });
  await save("2026-07-26", "2026-07-25");
  assert.deepEqual(await range(), { tr: "25-26 Temmuz 2026", en: "25–26 July 2026" }, "reversed input is swapped");
  assert.equal((await save("2026-02-30", "2026-03-01")).status, 400, "invalid dates are rejected");
  assert.deepEqual(await range(), { tr: "25-26 Temmuz 2026", en: "25–26 July 2026" });
  await save("", "");
  assert.equal(await range(), null, "clearing removes the range");
  db.close();
});

async function adminTestEnv(ip) {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const db = new DatabaseSync(":memory:");
  const testEnv = { ...env, SESSION_SECRET: "test-only-not-a-production-secret",
    ASSETS: { fetch: async (req) => { try { return new Response(await readFile(new URL(`../dist/client${new URL(req.url).pathname}`, import.meta.url))); } catch { return new Response("Not found", { status: 404 }); } } },
    DB: {
      prepare(sql) { let values=[]; return { bind(...args) { values=args; return this; }, async run() { return db.prepare(sql).run(...values); }, async first() { return db.prepare(sql).get(...values) ?? null; }, async all() { return { results: db.prepare(sql).all(...values) }; }, sql() { return [sql,values]; } }; },
      async batch(statements) { return statements.map(s => { const [sql,args]=s.sql(); return db.prepare(sql).run(...args); }); },
    } };
  const send = (path, init = {}) => worker.fetch(new Request(`https://eenstitu.com${path}`, { ...init, headers: { Origin: "https://eenstitu.com", accept: "text/html", "CF-Connecting-IP": ip, ...(init.headers || {}) } }), testEnv, context);
  const json = (body, cookie) => ({ method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  await send("/api/admin/session");
  const token = `reset-${ip}`;
  db.prepare("INSERT INTO password_reset_tokens VALUES (?,?,?,NULL)").run(Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("base64url"), "info@eenstitu.com", Date.now() + 60000);
  const proof = "F".repeat(43);
  await send("/api/admin/reset-password", json({ token, passwordProof: proof }));
  const cookie = (await send("/api/admin/login", json({ email: "info@eenstitu.com", passwordProof: proof }))).headers.get("set-cookie").split(";")[0];
  return { db, send, json, cookie, asAdmin: { headers: { Cookie: cookie } } };
}

const pdfText = (value) => "FEFF" + [...value].map((c) => c.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()).join("");

test("certificate settings: validation, serials and name overrides", async () => {
  const { db, send, json, cookie, asAdmin } = await adminTestEnv("192.0.2.209");
  const slug = "hipnosomatik-00019";
  const settings = { tr: ["{tarih} tarihinde gerçekleştirilen", "  ", "ikinci   satır"], en: ["Line one", "Line two", "Line three", "Line four"], date: "", serialPrefix: "HS-ON-", nextSerial: 1919, serials: { "Zeynep Kabaklı": "HS-ON-1910", "Listede Yok": "X-1" }, names: { "Zeynep Kabaklı": "Zeynep  Kabaklı Yılmaz", "Listede Yok": "X" } };
  assert.equal((await send("/api/admin/certificate-settings", json({ slug, settings }))).status, 401);
  assert.equal((await send("/api/admin/certificate-settings", json({ slug: "olmayan-kayit", settings }, cookie))).status, 404);
  assert.equal((await send("/api/admin/certificate-settings", json({ slug, settings: { ...settings, tr: [] } }, cookie))).status, 400);
  const saved = (await (await send("/api/admin/certificate-settings", json({ slug, settings }, cookie))).json()).settings;
  assert.deepEqual(saved.tr, ["{tarih} tarihinde gerçekleştirilen", "ikinci satır"]);
  assert.equal(saved.en.length, 3, "at most three lines");
  assert.deepEqual(saved.serials, { "Zeynep Kabaklı": "HS-ON-1910" }, "unknown participants are dropped");
  assert.deepEqual(saved.names, { "Zeynep Kabaklı": "Zeynep Kabaklı Yılmaz" });
  assert.equal("enabled" in saved, false);

  const record = (await (await send("/api/admin/records", asAdmin)).json()).records.find(r => r.slug === slug);
  assert.equal(record.certificate_settings.serials["Zeynep Kabaklı"], "HS-ON-1910");
  assert.equal(Object.keys(record.certificate_links).length, 18, "every participant has a permanent link");

  const visitor = (await (await send(`/api/verification?slug=${slug}`)).json()).record;
  assert.deepEqual(visitor.certificates, {}, "visitors never receive certificate links");
  assert.equal(JSON.parse(visitor.graduates_json).length, 18, "visitors still see the participant list");
  const admin = (await (await send(`/api/verification?slug=${slug}`, asAdmin)).json()).record;
  assert.equal(admin.certificates["Zeynep Kabaklı"].url, `/sertifika/${record.certificate_links["Zeynep Kabaklı"]}`);
  db.close();
});

test("certificate PDF: QR link opens the PDF, stays the same and follows edits", async () => {
  const { db, send, json, cookie, asAdmin } = await adminTestEnv("192.0.2.210");
  const links = async () => (await (await send("/api/admin/records", asAdmin)).json()).records.find(r => r.slug === "link-testi").certificate_links;
  await send("/api/admin/records", json({ record: { slug: "link-testi", title: "Link testi", graduates: ["Ayşe Yılmaz", "Mehmet Öz"], trainingStart: "2026-05-15", trainingEnd: "2026-05-22" } }, cookie));
  const first = await links();
  for (const value of Object.values(first)) assert.match(value, /^[A-Za-z0-9_-]{16}$/);
  assert.notEqual(first["Ayşe Yılmaz"], first["Mehmet Öz"], "every certificate has its own link");
  assert.deepEqual(await links(), first, "links do not change between requests");
  const ayse = first["Ayşe Yılmaz"];
  const url = `https://eenstitu.com/sertifika/${ayse}`;

  const response = await send(`/sertifika/${ayse}`);
  assert.equal(response.status, 200, "works without settings, using the default text");
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition"), /^inline; filename="Ayse Yilmaz - Sertifika\.pdf"/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const pdf = Buffer.from(await response.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.match(pdf.subarray(-6).toString(), /%%EOF\n$/);
  const tail = pdf.subarray(-20000).toString("latin1");
  assert.match(tail, /\/Prev \d+/, "incremental update on top of the base PDF");
  assert.ok(tail.includes(pdfText(url)), "the QR code / metadata carry the certificate's own link");
  assert.ok(tail.includes(pdfText("Ayşe Yılmaz - Sertifika")));
  assert.equal(Number(response.headers.get("content-length")), pdf.length);
  assert.match((await send(`/sertifika/${ayse}?indir=1`)).headers.get("content-disposition"), /^attachment;/);
  assert.equal((await send(`/sertifika/${ayse}`, { method: "HEAD" })).status, 200);

  await send("/api/admin/certificate-settings", json({ slug: "link-testi", settings: { tr: ["{tarih} tarihinde"], en: ["between {date}"], date: "", serialPrefix: "HS-", nextSerial: 3, serials: { "Ayşe Yılmaz": "HS-1" }, names: { "Ayşe Yılmaz": "Ayşe Yılmaz Kaya" } } }, cookie));
  const edited = Buffer.from(await (await send(`/sertifika/${ayse}`)).arrayBuffer()).subarray(-20000).toString("latin1");
  assert.ok(edited.includes(pdfText("Ayşe Yılmaz Kaya - Sertifika")), "name fix changes the certificate");
  assert.ok(edited.includes(pdfText(url)), "…but not its link");
  assert.equal((await links())["Ayşe Yılmaz"], ayse);

  await send("/api/admin/records", json({ record: { slug: "link-testi", title: "Link testi", graduates: ["Mehmet Öz"] } }, cookie));
  assert.equal((await send(`/sertifika/${ayse}`)).status, 404, "a removed participant's link stops working");
  await send("/api/admin/records", json({ record: { slug: "link-testi", title: "Link testi", graduates: ["Mehmet Öz", "Ayşe Yılmaz"] } }, cookie));
  assert.equal((await links())["Ayşe Yılmaz"], ayse, "re-adding the participant restores the same link");
  assert.equal((await send(`/sertifika/${ayse}`)).status, 200);

  assert.equal((await send("/sertifika/AAAAAAAAAAAAAAAA")).status, 404);
  assert.equal((await send(`/sertifika/${ayse}`, { method: "POST" })).status, 405);
  db.close();
});
