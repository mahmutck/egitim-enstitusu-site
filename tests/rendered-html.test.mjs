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
