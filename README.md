# KPD Projects website

The website remains a static GitHub Pages site for `https://kpdprojects.com.au/`. Its public design, contact details and Google Apps Script enquiry flow are preserved, while the project portfolio is now generated from structured content files.

## How the portfolio works

- Every job is stored once in `content/projects/`.
- Categories, their names, order and visibility are stored in `content/categories.json`.
- `npm run build` creates the homepage selection, the filterable portfolio, each project page, redirects and the sitemap in `dist/client/`. This directory alone is published by GitHub Pages. The private Site also uses `dist/server/index.js` for the editor connection.
- Draft projects are never included in the public build.
- Empty or hidden categories are not displayed.
- A project may use several categories without creating duplicate cards or pages.
- The homepage selects up to three featured projects and prioritises a spread of primary categories.

Visitors need no third-party layout or image-processing library. The build uses pinned Sharp 0.35.5 to create compressed, correctly oriented WebP copies of each project photo automatically. Original uploads stay in `assets/projects/`; generated website sizes go into `dist/client/assets/generated/`. Photo shapes are preserved, thumbnails have sensible height limits, and galleries are lazy-loaded.

## Plain-English editing guide

### 1. Add a completed job and its photos

1. Open the protected project editor at `https://kpdprojects.com.au/admin/` and sign in.
2. Choose **Completed projects**, then **New completed project**.
3. Add the title, a short page URL, location, summary and optional detailed description.
4. Select the primary category and any additional categories.
5. Upload a cover image: portrait, landscape or square JPEG, PNG or WebP, up to 12 MB. Add clear alternative text that describes what is visible. No manual cropping or resizing is needed. Export HEIC phone photos as JPEG first.
6. Add gallery photos, captions and alternative text. Add a before-and-after pair only when suitable matching photos are available.
7. Leave **Publication status** as **Draft** while checking the editor preview.
8. Save the draft. When ready, set **Publication status → Published**, save again, then set the toolbar's **Status → Ready** and choose **Publish → Publish now**.

Do not add a completion date when it is unknown. Optional fields disappear from the public page when left blank. You can mix different photo shapes in the same gallery. Upload once, check the preview, then publish; the build creates all required website copies. See `PHOTO_GUIDE.md` for details.

### 2. Edit, unpublish or remove a job

- To edit: open the job, make the change, preview it, then publish the update.
- To unpublish: change **Publication status** to **Draft**, then publish that change. The job remains in the content archive but disappears from the public site.
- To remove permanently: use **Delete entry**. Unpublishing is safer when the project may be needed later.
- If a page URL must change, add the old path to **Previous URLs** before publishing so visitors are redirected.

### 3. Create or rename a category

1. Open **Portfolio settings → Categories**.
2. Add or edit the category name, short description, order and visibility.
3. Keep the **URL name** unchanged when only renaming a category; this preserves shared links.
4. Publish the change. Empty categories stay hidden automatically.

### 4. Change the featured projects

Open a project and switch **Feature on homepage** on or off. Use **Display order** to control priority. The homepage shows no more than three and favours one project from each primary category before filling extra spaces.

### 5. Preview and publish changes

- The editor provides a project-card preview while content is being entered.
- **Save** creates or updates a draft in the editorial workflow.
- Set the toolbar's workflow **Status → Ready**, then **Publish → Publish now** merges the approved content into `main`. This toolbar status is separate from the job's **Publication status** field.
- GitHub Actions then checks the content, builds the static pages and deploys them to GitHub Pages.

## One-time editor and hosting setup

The public website, GitHub Pages Actions source and repository-limited GitHub App connection are configured. Owner sign-in, saving/removing an unpublished edit, photo upload and publishing through the editor were verified on 17 October 2026. The steps below are retained for recovery or a future owner transfer; they are not outstanding daily setup tasks. Do not recreate the app when simply adding a job. See `OPERATIONS_AUDIT.md` for the handover and verification record.

1. In the GitHub repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The included `.github/workflows/deploy-pages.yml` workflow will then build and publish every approved change.
2. Open `https://kpd-projects-portfolio.pastelpoppy3.chatgpt.site/editor-setup`, sign in to the private Site and use the **kpdprojectsau** GitHub account to register the prepared private GitHub App. Review and approve its contents/pull-requests write and metadata read permissions. Install it on **Only select repositories → folder-1**, not all repositories. The connection stores its client credentials encrypted in managed Sites D1; no secrets need to be copied into files, chat or browser source. No Netlify account is required.
3. Open `/admin/`, sign in with GitHub, save a draft and preview it. The app and the signed-in user must both have permission to edit this exact repository. Sign in again when the eight-hour GitHub session expires. The app does not retain user or refresh tokens on the server.

The editor has a built-in plain-English guide at `/admin/guide.html`. Publishing updates the public GitHub Pages website; the private review Site is separately deployed and does not automatically follow routine CMS commits. The public domain is not moved to Sites, and the private Site audience is preserved.

As an optional GitHub-only fallback, open a file under `content/projects/`, choose Edit, update only the JSON fields and commit through a pull request. Upload original JPEG/PNG/WebP files into `assets/projects/uploads/` and use their `/assets/projects/uploads/filename.jpg` paths. Merging the change builds all website copies automatically. Keep the Pages source set to GitHub Actions, not a legacy root-directory deployment.

`origin/main` on GitHub is the authoritative content source after CMS edits. Before a later code update or private-preview deployment, fetch and merge current GitHub content so an older private Site snapshot cannot overwrite newly added jobs or photos. The Sites source repository remains the deployment source for the private preview/authentication Worker; it does not replace the public repository as the daily editing source.

Visitors cannot edit content: the public editor requires GitHub-backed authentication and repository permission. Do not enable open registration.

For a local preview, run:

```text
npm ci
npm run build
python3 -m http.server 4173 --directory dist/client
```

Then open `http://localhost:4173/`.

### Maintaining the editor connection

`worker/index.js` handles only `/editor-setup` and `/auth/github`; other requests use the Sites static asset binding. Platform sign-in and the existing Sites audience remain in charge of access to the private Site. The GitHub App authenticates access to the public website's repository; it does not grant website visitors editing access.

The runtime secret `EDITOR_AUTH_KEY` is managed in Sites (name only in `.env.example`). Keep it: changing it makes the encrypted app configuration unreadable. The Drizzle schema and schema-only migrations live in `db/` and `drizzle/`. `npm run db:generate` generates later migrations; Sites applies hosted migrations during deployment. Do not create tables during web requests. GitHub Pages needs neither this secret nor a database. Authentication tests use in-memory SQLite and mock GitHub responses, never live client secrets or enquiries.

Run `npm run test:editor`, `npm run test:images`, `npm run test:forms` and `npm run check` before publishing code. The form tests execute the real Apps Script source using in-memory Sheets/email substitutes; they never contact Google or deliver an enquiry. Development-only Drizzle tooling is not shipped to browsers or the Worker.

## Backups and portability

All project text and image references are plain JSON and all uploaded photos are ordinary files in `assets/projects/`. A normal Git clone or repository download is a complete backup. Git history keeps prior published versions, and the content can be moved to another static-site generator or CMS without extracting it from a database.

## Enquiry delivery

The quote form still posts to the Google Apps Script Web App endpoint configured in `script.js`. Enquiries are emailed to `kpdprojectsau@gmail.com` and saved to the existing private Google Sheet. The current service does not store uploaded files, so the form still clearly asks visitors to email selected photos separately.

Backend source and deployment notes remain in `google-apps-script/SETUP.md`.

## Mobile maintenance and verification

Shared templates now provide touch-sized links and filters, a scrollable mobile menu, safe-area spacing, responsive photos, an enlarged gallery with swipe/keyboard controls, and category-aware return links. Form details are kept only in the current browser tab's session while editing and are cleared on the success page. Photo files must be selected again after a reload.

Run `npm run check` after changing content. For the browser regression checks, start the local server above and run:

```text
playwright-cli --session kpd-mobile open http://127.0.0.1:4173/
playwright-cli --session kpd-mobile run-code --filename scripts/mobile-browser-checks.js
playwright-cli --session kpd-mobile run-code --filename scripts/photo-browser-checks.js
```

The browser checks intercept the Google Apps Script endpoint and never deliver a real enquiry. Keep that interception in place when testing successful submissions. See `MOBILE_AUDIT.md` for the tested screens, failure cases and remaining limits.
