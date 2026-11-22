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

test("participant certificates: admin upload, public view/download, replace and delete", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  const store = new Map();
  const kv = {
    async get(key) { const value = store.get(key); return value ? new Blob([value]).stream() : null; },
    async put(key, value) { store.set(key, new Uint8Array(value)); },
    async delete(key) { store.delete(key); },
  };
  const testEnv = { ...env, SESSION_SECRET: "test-only-not-a-production-secret", CERTIFICATES: kv, DB: {
    prepare(sql) { let values=[]; return { bind(...args) { values=args; return this; }, async run() { return db.prepare(sql).run(...values); }, async first() { return db.prepare(sql).get(...values) ?? null; }, async all() { return { results: db.prepare(sql).all(...values) }; }, sql() { return [sql,values]; } }; },
    async batch(statements) { return statements.map(s => { const [sql,args]=s.sql(); return db.prepare(sql).run(...args); }); },
  } };
  const send = (path, init = {}) => worker.fetch(new Request(`https://eenstitu.com${path}`, { ...init, headers: { Origin: "https://eenstitu.com", ...(init.headers || {}) } }), testEnv, context);
  await send("/api/admin/session");
  const token = "certificate-test-token";
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("base64url");
  db.prepare("INSERT INTO password_reset_tokens VALUES (?,?,?,NULL)").run(hash, "info@eenstitu.com", Date.now() + 60000);
  const proof = "B".repeat(43);
  await send("/api/admin/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, passwordProof: proof }) });
  const login = await send("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "info@eenstitu.com", passwordProof: proof }) });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const asAdmin = { headers: { Cookie: cookie } };

  const slug = "hipnosomatik-00019"; const name = "Zeynep Kabaklı";
  const pdfBytes = new TextEncoder().encode("%PDF-1.7\n% test certificate\n%%EOF");
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const upload = (fields, withCookie = true) => { const body = new FormData(); for (const [k, v] of Object.entries(fields)) body.set(k, v); return send("/api/admin/certificates", { method: "POST", body, headers: withCookie ? { Cookie: cookie } : {} }); };

  assert.equal((await upload({ slug, name, pdf: new File([pdfBytes], "Zeynep_Kabakl_.pdf") }, false)).status, 401);
  assert.equal((await upload({ slug, name: "Listede Olmayan Kişi", pdf: new File([pdfBytes], "x.pdf") })).status, 400);
  assert.equal((await upload({ slug, name, pdf: new File([new TextEncoder().encode("<html>not a pdf")], "x.pdf") })).status, 400);
  const crossOrigin = new FormData(); crossOrigin.set("slug", slug); crossOrigin.set("name", name); crossOrigin.set("pdf", new File([pdfBytes], "x.pdf"));
  assert.equal((await worker.fetch(new Request("https://eenstitu.com/api/admin/certificates", { method: "POST", body: crossOrigin, headers: { Origin: "https://evil.example", Cookie: cookie } }), testEnv, context)).status, 403);

  const ok = await upload({ slug, name, pdf: new File([pdfBytes], "Zeynep_Kabakl_.pdf"), preview: new File([jpegBytes], "preview.jpg", { type: "image/jpeg" }) });
  assert.equal(ok.status, 200);
  const { certificate } = await ok.json();
  assert.equal(certificate.key, "zeynep-kabakli");
  assert.match(certificate.pdf, /^\/sertifika\/hipnosomatik-00019\/zeynep-kabakli\.pdf\?v=[a-z0-9]+$/);
  assert.equal(store.size, 2);

  const anonymous = await (await send(`/api/verification?slug=${slug}`)).json();
  assert.equal(anonymous.record.admin, false);
  assert.deepEqual(anonymous.record.certificates, {}, "visitors only see the participant list");
  assert.equal((await send(certificate.pdf)).status, 404, "certificate files are admin-only");
  const verification = await (await send(`/api/verification?slug=${slug}`, asAdmin)).json();
  assert.equal(verification.record.admin, true);
  assert.deepEqual(Object.keys(verification.record.certificates), [name]);
  assert.equal(verification.record.certificates[name].pdf, certificate.pdf);

  const inline = await send(certificate.pdf, asAdmin);
  assert.equal(inline.status, 200);
  assert.equal(inline.headers.get("content-type"), "application/pdf");
  assert.match(inline.headers.get("content-disposition"), /^inline; filename="Zeynep Kabakli - Sertifika\.pdf"; filename\*=UTF-8''Zeynep%20Kabakl%C4%B1%20-%20Sertifika\.pdf$/);
  assert.equal(inline.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.match(inline.headers.get("cache-control"), /^private/);
  assert.deepEqual(new Uint8Array(await inline.arrayBuffer()), pdfBytes);
  assert.match((await send(`${certificate.pdf}&indir=1`, asAdmin)).headers.get("content-disposition"), /^attachment;/);
  const preview = await send(certificate.preview, asAdmin);
  assert.equal(preview.headers.get("content-type"), "image/jpeg");

  const records = await (await send("/api/admin/records", { headers: { Cookie: cookie } })).json();
  assert.equal(records.storageReady, true);
  assert.equal(records.records.find(r => r.slug === slug).certificates[name].size, pdfBytes.length);

  const replaced = await (await upload({ slug, name, pdf: new File([pdfBytes], "yeni.pdf") })).json();
  assert.notEqual(replaced.certificate.pdf, certificate.pdf);
  assert.equal(replaced.certificate.preview, null);
  assert.equal(store.size, 1, "old version files are removed after replacement");
  assert.equal((await send(certificate.preview, asAdmin)).status, 404);

  assert.equal((await send("/api/admin/certificates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, name }) })).status, 401);
  const removed = await send("/api/admin/certificates", { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ slug, name }) });
  assert.equal(removed.status, 200);
  assert.equal(store.size, 0);
  assert.equal((await send(replaced.certificate.pdf, asAdmin)).status, 404);
  const malformed = await send("/sertifika/hipnosomatik-00019/Zeynep%20Kabakl%C4%B1.pdf");
  assert.notEqual(malformed.headers.get("content-type"), "application/pdf", "only slugified keys reach the certificate route");
  db.close();
});

test("generated certificates: admin settings, serials and public verification data", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  const store = new Map();
  const kv = { async get(key) { const v = store.get(key); return v ? new Blob([v]).stream() : null; }, async put(key, value) { store.set(key, new Uint8Array(value)); }, async delete(key) { store.delete(key); } };
  const testEnv = { ...env, SESSION_SECRET: "test-only-not-a-production-secret", CERTIFICATES: kv, DB: {
    prepare(sql) { let values=[]; return { bind(...args) { values=args; return this; }, async run() { return db.prepare(sql).run(...values); }, async first() { return db.prepare(sql).get(...values) ?? null; }, async all() { return { results: db.prepare(sql).all(...values) }; }, sql() { return [sql,values]; } }; },
    async batch(statements) { return statements.map(s => { const [sql,args]=s.sql(); return db.prepare(sql).run(...args); }); },
  } };
  const send = (path, init = {}) => worker.fetch(new Request(`https://eenstitu.com${path}`, { ...init, headers: { Origin: "https://eenstitu.com", ...(init.headers || {}) } }), testEnv, context);
  const json = (body, cookie) => ({ method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  await send("/api/admin/session");
  const token = "generated-test-token";
  db.prepare("INSERT INTO password_reset_tokens VALUES (?,?,?,NULL)").run(Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("base64url"), "info@eenstitu.com", Date.now() + 60000);
  const proof = "C".repeat(43);
  await send("/api/admin/reset-password", json({ token, passwordProof: proof }));
  const cookie = (await send("/api/admin/login", json({ email: "info@eenstitu.com", passwordProof: proof }))).headers.get("set-cookie").split(";")[0];

  const slug = "hipnosomatik-00019";
  const settings = { enabled: true, tr: ["15-22 Mayıs 2026 tarihinde gerçekleştirilen", "  ", "ikinci   satır"], en: ["Line one", "Line two", "Line three", "Line four"], date: "14-06-2026", serialPrefix: "HS-ON-", nextSerial: 1919, serials: { "Zeynep Kabaklı": "HS-ON-1910", "Listede Yok": "X-1" } };
  assert.equal((await send("/api/admin/certificate-settings", json({ slug, settings }))).status, 401);
  assert.equal((await send("/api/admin/certificate-settings", json({ slug: "olmayan-kayit", settings }, cookie))).status, 404);
  assert.equal((await send("/api/admin/certificate-settings", json({ slug, settings: { ...settings, tr: [] } }, cookie))).status, 400);
  const saved = await (await send("/api/admin/certificate-settings", json({ slug, settings }, cookie))).json();
  assert.deepEqual(saved.settings.tr, ["15-22 Mayıs 2026 tarihinde gerçekleştirilen", "ikinci satır"]);
  assert.equal(saved.settings.en.length, 3, "at most three lines");
  assert.deepEqual(saved.settings.serials, { "Zeynep Kabaklı": "HS-ON-1910" }, "serials of unknown participants are dropped");

  const records = await (await send("/api/admin/records", { headers: { Cookie: cookie } })).json();
  const record = records.records.find(r => r.slug === slug);
  assert.equal(record.certificate_settings.date, "14-06-2026");
  assert.equal(record.participant_keys["Zeynep Kabaklı"], "zeynep-kabakli");

  const visitor = (await (await send(`/api/verification?slug=${slug}`)).json()).record;
  assert.equal(visitor.generated, null, "visitors never receive certificate data");
  assert.deepEqual(visitor.certificates, {});
  assert.equal(JSON.parse(visitor.graduates_json).length, 18, "visitors still see the participant list");
  const asAdmin = { headers: { Cookie: cookie } };
  let verification = (await (await send(`/api/verification?slug=${slug}`, asAdmin)).json()).record;
  assert.deepEqual(verification.generated, { tr: saved.settings.tr, en: saved.settings.en, date: "14-06-2026" });
  assert.equal(Object.keys(verification.certificates).length, 18, "every participant gets a generated certificate");
  assert.deepEqual(verification.certificates["Zeynep Kabaklı"], { key: "zeynep-kabakli", generated: true, serial: "HS-ON-1910" });
  assert.equal(verification.certificates["Berna Kartal"].serial, "");

  const body = new FormData(); body.set("slug", slug); body.set("name", "Berna Kartal"); body.set("pdf", new File([new TextEncoder().encode("%PDF-1.4 x")], "b.pdf"));
  assert.equal((await send("/api/admin/certificates", { method: "POST", body, headers: { Cookie: cookie } })).status, 200);
  verification = (await (await send(`/api/verification?slug=${slug}`, asAdmin)).json()).record;
  assert.ok(verification.certificates["Berna Kartal"].pdf, "an uploaded PDF takes precedence over generation");

  await send("/api/admin/certificate-settings", json({ slug, settings: { ...settings, enabled: false } }, cookie));
  verification = (await (await send(`/api/verification?slug=${slug}`, asAdmin)).json()).record;
  assert.equal(verification.generated, null);
  assert.deepEqual(Object.keys(verification.certificates), ["Berna Kartal"]);
  db.close();
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
