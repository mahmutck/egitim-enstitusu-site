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
