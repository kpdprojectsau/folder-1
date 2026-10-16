// GitHub credentials for the existing Decap editor, not a replacement for Sites sign-in.
// The website remains static; only these setup and authentication routes use the Worker.
export const SITE_ORIGIN = "https://kpd-projects-portfolio.pastelpoppy3.chatgpt.site";
export const REPOSITORY = "kpdprojectsau/folder-1";
const OWNER_ID = 281896408;
const REPOSITORY_ID = 1229704984;
const ORIGINS = new Map([
  ["kpdprojects.com.au", "https://kpdprojects.com.au"],
  ["www.kpdprojects.com.au", "https://www.kpdprojects.com.au"],
  [new URL(SITE_ORIGIN).host, SITE_ORIGIN],
]);
const CALLBACK = `${SITE_ORIGIN}/auth/github/callback`;
const COOKIE = "__Host-kpd-editor-flow";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const escape = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const unb64 = value => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0));
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));

async function key(env) {
  if (!/^[a-f0-9]{64}$/.test(env.EDITOR_AUTH_KEY || "")) throw new Error("Missing encryption key");
  return crypto.subtle.importKey("raw", Uint8Array.from(env.EDITOR_AUTH_KEY.match(/../g), n => parseInt(n, 16)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(env, value, purpose) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(purpose) }, await key(env), encoder.encode(JSON.stringify(value)));
  return `${b64(iv)}.${b64(new Uint8Array(ciphertext))}`;
}
export async function unseal(env, value, purpose) {
  const [iv, ciphertext, extra] = (value || "").split(".");
  if (!iv || !ciphertext || extra) throw new Error("Invalid encrypted value");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv), additionalData: encoder.encode(purpose) }, await key(env), unb64(ciphertext));
  return JSON.parse(decoder.decode(plaintext));
}
const cookie = (value, seconds = 600) => `${COOKIE}=${value}; Path=/; Max-Age=${seconds}; Secure; HttpOnly; SameSite=Lax`;
async function readFlow(request, env, purpose, state) {
  const raw = request.headers.get("Cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const flow = await unseal(env, raw, purpose);
  if (!state || flow.state !== state || flow.expires < Date.now() || flow.expires > Date.now() + 610000) throw new Error("Expired sign-in");
  if (flow.user !== (request.headers.get("oai-authenticated-user-id") || "")) throw new Error("Different visitor");
  return flow;
}
async function flowCookie(request, env, purpose, extra = {}) {
  const flow = { state: random(), expires: Date.now() + 600000, user: request.headers.get("oai-authenticated-user-id") || "", ...extra };
  return { flow, header: cookie(await seal(env, flow, purpose)) };
}
async function config(env) {
  const row = await env.DB.prepare("SELECT encrypted_value FROM editor_auth WHERE id = ?").bind("github").first();
  return row ? unseal(env, row.encrypted_value, "github-app") : null;
}
function page(title, body, { status = 200, script = "", headers = {} } = {}) {
  const nonce = random();
  return new Response(`<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><title>${escape(title)} | KPD Projects</title><style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;background:#f6f7f5;color:#0a192c;font:17px/1.6 system-ui,sans-serif;padding:max(24px,env(safe-area-inset-top)) 20px max(40px,env(safe-area-inset-bottom))}main{max-width:720px;margin:6vh auto;background:white;padding:clamp(24px,5vw,48px);border:1px solid #d9e0e6;border-radius:12px}h1{font-size:clamp(28px,6vw,40px);line-height:1.15}a{color:#176ca8}a:focus-visible,button:focus-visible{outline:3px solid #176ca8;outline-offset:4px}.button,button{display:inline-block;margin:8px 8px 8px 0;border:0;border-radius:4px;background:#0a192c;color:white;text-decoration:none;font:inherit;font-weight:650;padding:12px 20px;cursor:pointer;min-height:48px}li{margin:10px 0}.label{text-transform:uppercase;font-size:12px;letter-spacing:2px;color:#176ca8;font-weight:750}.note{background:#f2f6f9;padding:16px;border-left:3px solid #176ca8}code{overflow-wrap:anywhere}footer{margin-top:32px;font-size:14px}</style></head><body><main><p class="label">KPD Projects · Website management</p><h1>${escape(title)}</h1>${body}<footer><a href="/admin/guide.html">How to add or edit jobs</a> · <a href="/">View website</a></footer></main>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; form-action 'self' https://github.com; base-uri 'none'; frame-ancestors 'none'`, ...headers },
  });
}
function popup(origin, result, success) {
  // Decap's documented external OAuth postMessage protocol. Never send to '*'.
  const message = `authorization:github:${success ? "success" : "error"}:${JSON.stringify(result)}`;
  const jsValue = value => JSON.stringify(value).replaceAll("<", "\\u003c");
  const script = `const origin=${jsValue(origin)},message=${jsValue(message)};function handshake(e){if(e.origin!==origin||e.source!==window.opener||e.data!=="authorizing:github")return;window.removeEventListener("message",handshake);window.opener.postMessage(message,origin)}window.addEventListener("message",handshake);if(window.opener){window.opener.postMessage("authorizing:github",origin)}else{document.getElementById("result").textContent="Open the editor and choose Login with GitHub to sign in."}history.replaceState(null,"","/auth/github/callback");`;
  return page(success ? "Sign-in complete" : "Sign-in needs attention", `<p id="result">${success ? "Returning you to the project editor. You can close this window if it stays open." : escape(result.message)}</p><p><a href="/admin/">Return to editor</a></p>`, { script, headers: { "Set-Cookie": cookie("", 0) } });
}
function manifest() {
  return {
    name: "KPD Projects Website Editor", url: "https://kpdprojects.com.au",
    description: "Private editor for completed jobs on the KPD Projects website.",
    redirect_url: `${SITE_ORIGIN}/editor-setup/callback`, callback_urls: [CALLBACK],
    setup_url: `${SITE_ORIGIN}/editor-setup`, public: false,
    hook_attributes: { url: `${SITE_ORIGIN}/auth/github/webhook`, active: false },
    default_permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    default_events: [], request_oauth_on_install: false,
  };
}
const apiHeaders = { Accept: "application/vnd.github+json", "User-Agent": "KPD-Projects-Editor", "X-GitHub-Api-Version": "2022-11-28" };
export function createHandler(fetcher = fetch) {
  return async function handle(request, env) {
    const url = new URL(request.url);
    const route = url.pathname.replace(/\/$/, "");
    if (!route.startsWith("/auth/github") && !route.startsWith("/editor-setup")) return env.ASSETS.fetch(request);
    if (url.origin !== SITE_ORIGIN) return page("Use the protected setup address", `<p><a href="${SITE_ORIGIN}/editor-setup">Open website setup</a></p>`, { status: 400 });
    if (!env.DB || !env.EDITOR_AUTH_KEY) return page("Editor connection not ready", "<p>The website is available, but the secure editor connection needs its hosting configuration. Contact the website administrator.</p>", { status: 503 });
    try {
      if (route === "/editor-setup" && request.method === "GET") {
        const app = await config(env);
        return app ? page("Editor connection registered", `<p>The private GitHub App is registered. It must be installed on <strong>${REPOSITORY}</strong> before the editor can save changes.</p><ol><li>Choose “Install editor connection”. On GitHub, select <strong>Only select repositories → folder-1</strong>.</li><li>Return here and open the editor. Sign in with a GitHub account that can edit this repository.</li><li>Save a draft, preview it, then publish when ready.</li></ol><a class="button" href="${escape(app.app_url)}/installations/new">Install editor connection</a><a class="button" href="/admin/">Open project editor</a><p>The public website releases through GitHub Pages. This private Site keeps its existing access restrictions.</p>`) : page("Connect the job editor", `<p>Register a private GitHub App owned by <strong>kpdprojectsau</strong>. No new hosting account, paid service or copied API key is needed.</p><p class="note">The app needs read/write access to website content and pull requests, plus read-only repository metadata. Install it on <strong>folder-1 only</strong>. It does not request account, billing, email, administration or workflow access.</p><p>GitHub will show the registration and installation approval screens. Only the kpdprojectsau-owned app is accepted by this setup.</p><form method="post" action="/editor-setup/start"><button type="submit">Prepare GitHub registration</button></form>`);
      }
      if (route === "/editor-setup/start" && request.method === "POST") {
        if (request.headers.get("Origin") !== SITE_ORIGIN || !request.headers.get("oai-authenticated-user-id")) return page("Setup request not accepted", "<p>Open setup while signed in to this private Site and try again.</p>", { status: 403 });
        if (await config(env)) return Response.redirect(`${SITE_ORIGIN}/editor-setup`, 303);
        const { flow, header } = await flowCookie(request, env, "registration");
        return page("Register with GitHub", `<p>The details are prepared. Continue with the <strong>kpdprojectsau</strong> account and review the permissions on GitHub. Registration does not publish or change any jobs.</p><form method="post" action="https://github.com/settings/apps/new?state=${encodeURIComponent(flow.state)}"><input type="hidden" name="manifest" value="${escape(JSON.stringify(manifest()))}"><button type="submit">Review registration on GitHub</button></form>`, { headers: { "Set-Cookie": header } });
      }
      if (route === "/editor-setup/callback" && request.method === "GET") {
        await readFlow(request, env, "registration", url.searchParams.get("state"));
        if (await config(env)) return Response.redirect(`${SITE_ORIGIN}/editor-setup`, 303);
        const code = url.searchParams.get("code");
        if (!/^[a-zA-Z0-9_\-]{10,200}$/.test(code || "")) throw new Error("Invalid registration code");
        const response = await fetcher(`https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`, { method: "POST", headers: apiHeaders });
        if (!response.ok) throw new Error("Registration exchange failed");
        const app = await response.json();
        const permissions = app.permissions || {};
        if (app.owner?.id !== OWNER_ID || app.owner?.login?.toLowerCase() !== "kpdprojectsau" || !app.client_id || !app.client_secret || !/^https:\/\/github\.com\/apps\/[a-z0-9-]+$/.test(app.html_url || "") || permissions.contents !== "write" || permissions.pull_requests !== "write" || Object.entries(permissions).some(([name, value]) => !["contents", "pull_requests", "metadata"].includes(name) || (name === "metadata" && value !== "read"))) throw new Error("Unexpected app owner or permissions");
        const stored = { app_id: app.id, client_id: app.client_id, client_secret: app.client_secret, app_url: app.html_url };
        await env.DB.prepare("INSERT INTO editor_auth (id, encrypted_value) VALUES (?, ?) ON CONFLICT(id) DO NOTHING").bind("github", await seal(env, stored, "github-app")).run();
        return new Response(null, { status: 303, headers: { Location: `${SITE_ORIGIN}/editor-setup`, "Set-Cookie": cookie("", 0), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      }
      if (route === "/auth/github" && request.method === "GET") {
        const origin = ORIGINS.get(url.searchParams.get("site_id"));
        if (url.searchParams.get("provider") !== "github" || !origin) return page("Editor address not recognised", "<p>Start sign-in from the KPD Projects editor.</p>", { status: 400 });
        const app = await config(env);
        if (!app) return page("One-time connection required", "<p>The owner must finish the GitHub registration before jobs can be edited.</p><a class=\"button\" href=\"/editor-setup\">Open setup</a>", { status: 503 });
        const verifier = random();
        const { flow, header } = await flowCookie(request, env, "authorization", { origin, verifier });
        const target = new URL("https://github.com/login/oauth/authorize");
        target.search = new URLSearchParams({ client_id: app.client_id, redirect_uri: CALLBACK, state: flow.state, code_challenge: b64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)))), code_challenge_method: "S256", allow_signup: "false" }).toString();
        return new Response(null, { status: 302, headers: { Location: target.href, "Set-Cookie": header, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      }
      if (route === "/auth/github/callback" && request.method === "GET") {
        const flow = await readFlow(request, env, "authorization", url.searchParams.get("state"));
        if (url.searchParams.has("error")) return popup(flow.origin, { message: "GitHub sign-in was cancelled. Your website has not changed. Try again from the editor." }, false);
        const app = await config(env);
        const code = url.searchParams.get("code");
        if (!app || !code || code.length > 200) throw new Error("Incomplete authorization");
        const response = await fetcher("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: app.client_id, client_secret: app.client_secret, code, redirect_uri: CALLBACK, code_verifier: flow.verifier, repository_id: String(REPOSITORY_ID) }) });
        const token = await response.json();
        if (!response.ok || !token.access_token || token.error) return popup(flow.origin, { message: "GitHub could not complete sign-in. Close this window and try again." }, false);
        const repository = await fetcher(`https://api.github.com/repos/${REPOSITORY}`, { headers: { ...apiHeaders, Authorization: `Bearer ${token.access_token}` } });
        const repo = repository.ok ? await repository.json() : null;
        if (repo?.id !== REPOSITORY_ID || !repo.permissions?.push) return popup(flow.origin, { message: "This account or app cannot edit folder-1. Ask the owner to install the editor app on that repository and give your GitHub account write access." }, false);
        // Do not retain user tokens or refresh tokens on the server. Sign in again after expiry.
        return popup(flow.origin, { token: token.access_token, provider: "github" }, true);
      }
      return page("Page not found", "<p>Return to the editor or website setup.</p>", { status: 404 });
    } catch {
      // Never log upstream bodies, auth codes, cookies, credentials or user tokens.
      return page("Please restart this connection", "<p>This link has expired or could not be verified. No website content was changed. Start again from the project editor or setup page. If it repeats, ask the administrator to check the GitHub App registration.</p><a class=\"button\" href=\"/editor-setup\">Website setup</a><a href=\"/admin/\">Project editor</a>", { status: 400, headers: { "Set-Cookie": cookie("", 0) } });
    }
  };
}
export default { fetch: createHandler() };
