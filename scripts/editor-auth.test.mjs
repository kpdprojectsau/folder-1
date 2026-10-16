import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { createHandler, seal, unseal, SITE_ORIGIN } from "../worker/index.js";

const app = { id: 123, owner: { id: 281896408, login: "kpdprojectsau" }, client_id: "test-client", client_secret: "test-secret-only", html_url: "https://github.com/apps/kpd-projects-website-editor", permissions: { contents: "write", pull_requests: "write", metadata: "read" } };
const siteHost = new URL(SITE_ORIGIN).host;
const cookieFrom = response => response.headers.get("set-cookie").split(";")[0];
const userHeaders = { "oai-authenticated-user-id": "site-owner" };
async function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(await readFile(new URL("../drizzle/0000_groovy_sleepwalker.sql", import.meta.url), "utf8"));
  const env = {
    EDITOR_AUTH_KEY: "ab".repeat(32),
    ASSETS: { fetch: async request => new Response(`asset:${new URL(request.url).pathname}`) },
    DB: { prepare(sql) { const statement = db.prepare(sql); return { bind(...args) { return { first: async () => statement.get(...args) || null, run: async () => statement.run(...args) }; } }; } },
  };
  return { db, env };
}
const request = (path, options = {}) => new Request(`${SITE_ORIGIN}${path}`, options);
async function register(env, handler = createHandler(async () => Response.json(app))) {
  const start = await handler(request("/editor-setup/start", { method: "POST", headers: { Origin: SITE_ORIGIN, ...userHeaders } }), env);
  assert.equal(start.status, 200);
  const html = await start.text();
  const state = html.match(/settings\/apps\/new\?state=([^"&]+)/)[1];
  const callback = request(`/editor-setup/callback?state=${state}&code=sample-conversion-code`, { headers: { Cookie: cookieFrom(start), ...userHeaders } });
  return handler(callback, env);
}
async function begin(env, handler = createHandler()) {
  const response = await handler(request(`/auth/github?provider=github&site_id=${siteHost}&scope=repo` , { headers: userHeaders }), env);
  return { response, state: new URL(response.headers.get("location")).searchParams.get("state"), cookie: cookieFrom(response) };
}

test("static website routes remain untouched, including forms and gallery assets", async () => {
  const { env } = await setup();
  for (const path of ["/", "/projects/", "/admin/", "/assets/photo.webp", "/thank-you.html"]) {
    assert.equal(await (await createHandler()(request(path), env)).text(), `asset:${path}`);
  }
});
test("configuration encryption is authenticated and purpose-bound", async () => {
  const { env } = await setup();
  const encrypted = await seal(env, { secret: "never-plaintext" }, "config");
  assert.ok(!encrypted.includes("never-plaintext"));
  assert.deepEqual(await unseal(env, encrypted, "config"), { secret: "never-plaintext" });
  await assert.rejects(unseal(env, encrypted, "other-purpose"));
  await assert.rejects(unseal({ ...env, EDITOR_AUTH_KEY: "bc".repeat(32) }, encrypted, "config"));
});
test("setup is explicit when configuration is missing", async () => {
  const response = await createHandler()(request("/editor-setup"), {});
  assert.equal(response.status, 503);
  assert.match(await response.text(), /not ready/);
});
test("registration rejects anonymous visitors and cross-origin posts", async () => {
  const { env } = await setup();
  for (const headers of [{ Origin: SITE_ORIGIN }, { Origin: "https://attacker.example", ...userHeaders }]) {
    assert.equal((await createHandler()(request("/editor-setup/start", { method: "POST", headers }), env)).status, 403);
  }
});
test("manifest only requests repository content, pull requests and metadata", async () => {
  const { env } = await setup();
  const response = await createHandler()(request("/editor-setup/start", { method: "POST", headers: { Origin: SITE_ORIGIN, ...userHeaders } }), env);
  assert.match(response.headers.get("set-cookie"), /Secure; HttpOnly; SameSite=Lax/);
  const html = await response.text();
  assert.match(html, /&quot;public&quot;:false/);
  assert.match(html, /&quot;contents&quot;:&quot;write&quot;/);
  assert.doesNotMatch(html, /&quot;administration&quot;/);
});
test("registration stores encrypted credentials once and discards unused keys", async () => {
  const { env, db } = await setup();
  assert.equal((await register(env)).status, 303);
  const saved = db.prepare("SELECT encrypted_value FROM editor_auth").get().encrypted_value;
  assert.ok(!saved.includes(app.client_secret));
  assert.deepEqual(await unseal(env, saved, "github-app"), { app_id: app.id, client_id: app.client_id, client_secret: app.client_secret, app_url: app.html_url });
  const page = await createHandler()(request("/editor-setup"), env);
  assert.match(await page.text(), /folder-1 only|Only select repositories/);
  assert.equal((await createHandler()(request("/editor-setup/start", { method: "POST", headers: { Origin: SITE_ORIGIN, ...userHeaders } }), env)).status, 303);
});
test("registration rejects a different owner or expanded permissions", async () => {
  for (const badApp of [{ ...app, owner: { id: 2, login: "other" } }, { ...app, permissions: { ...app.permissions, administration: "write" } }]) {
    const { env, db } = await setup();
    assert.equal((await register(env, createHandler(async () => Response.json(badApp)))).status, 400);
    assert.equal(db.prepare("SELECT count(*) AS n FROM editor_auth").get().n, 0);
  }
});
test("unregistered editor gives setup link instead of broken OAuth redirect", async () => {
  const { env } = await setup();
  const response = await createHandler()(request(`/auth/github?provider=github&site_id=${siteHost}`), env);
  assert.equal(response.status, 503);
  assert.match(await response.text(), /One-time connection required/);
});
test("editor accepts only exact production origins and GitHub provider", async () => {
  const { env } = await setup();
  await register(env);
  for (const path of ["/auth/github?provider=github&site_id=attacker.example", "/auth/github?provider=other&site_id=kpdprojects.com.au", "/auth/github?provider=github&site_id=kpdprojects.com.au.attacker.example"]) assert.equal((await createHandler()(request(path), env)).status, 400);
});
test("sign-in uses PKCE, exact callback and no broad OAuth scope", async () => {
  const { env } = await setup();
  await register(env);
  const { response } = await begin(env);
  const destination = new URL(response.headers.get("location"));
  assert.equal(destination.origin, "https://github.com");
  assert.equal(destination.searchParams.get("code_challenge_method"), "S256");
  assert.equal(destination.searchParams.get("code_challenge").length, 43);
  assert.equal(destination.searchParams.get("redirect_uri"), `${SITE_ORIGIN}/auth/github/callback`);
  assert.equal(destination.searchParams.get("scope"), null);
});
test("callback rejects missing, tampered, expired or different-visitor state before network calls", async () => {
  const { env } = await setup();
  await register(env);
  const { state, cookie } = await begin(env);
  const handler = createHandler(() => { throw new Error("must not call network"); });
  for (const [actualState, actualCookie, visitor] of [["wrong", cookie, "site-owner"], [state, "", "site-owner"], [state, cookie + "x", "site-owner"], [state, cookie, "other"]]) {
    const response = await handler(request(`/auth/github/callback?code=code&state=${actualState}`, { headers: { Cookie: actualCookie, "oai-authenticated-user-id": visitor } }), env);
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /test-secret-only|code=code/);
  }
  const expired = await seal(env, { state, expires: Date.now() - 1, user: "site-owner" }, "authorization");
  assert.equal((await handler(request(`/auth/github/callback?state=${state}`, { headers: { Cookie: `__Host-kpd-editor-flow=${expired}`, ...userHeaders } }), env)).status, 400);
});
test("successful callback restricts token to this repo and uses exact-origin popup handshake", async () => {
  const { env, db } = await setup();
  await register(env);
  const { state, cookie } = await begin(env);
  const calls = [];
  const handler = createHandler(async (url, options) => {
    calls.push({ url, options });
    return url.includes("access_token") ? Response.json({ access_token: "test-user-token", refresh_token: "discard-me" }) : Response.json({ id: 1229704984, permissions: { push: true } });
  });
  const response = await handler(request(`/auth/github/callback?code=good&state=${state}`, { headers: { Cookie: cookie, ...userHeaders } }), env);
  const html = await response.text();
  assert.match(html, /authorization:github:success:/);
  assert.match(html, /e.source!==window.opener/);
  assert.doesNotMatch(html, /postMessage\([^;]+,"\*"\)|test-secret-only|discard-me/);
  assert.equal(calls[0].options.body.get("repository_id"), "1229704984");
  assert.ok(calls[0].options.body.get("code_verifier"));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(db.prepare("SELECT count(*) AS n FROM editor_auth").get().n, 1);
});
test("cancelled sign-in and repo permission failures are clear and never disclose tokens", async () => {
  const { env } = await setup();
  await register(env);
  const { state, cookie } = await begin(env);
  for (const permission of [false, true]) {
    const handler = createHandler(async url => url.includes("access_token") ? Response.json({ access_token: "not-for-browser" }) : Response.json({ id: 7, permissions: { push: permission } }));
    const response = await handler(request(`/auth/github/callback?code=good&state=${state}`, { headers: { Cookie: cookie, ...userHeaders } }), env);
    const html = await response.text();
    assert.match(html, /authorization:github:error:/);
    assert.doesNotMatch(html, /not-for-browser/);
  }
  const cancelled = await createHandler()(request(`/auth/github/callback?error=access_denied&state=${state}`, { headers: { Cookie: cookie, ...userHeaders } }), env);
  assert.match(await cancelled.text(), /sign-in was cancelled/);
});
