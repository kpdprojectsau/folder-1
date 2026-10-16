# Operational handover — 17 October 2026

## Published website and editing

- Public website: https://kpdprojects.com.au/
- Protected editor: https://kpdprojects.com.au/admin/
- Plain-English editing guide: https://kpdprojects.com.au/admin/guide.html
- Private review/authentication host: https://kpd-projects-portfolio.pastelpoppy3.chatgpt.site
- GitHub Pages uses the included Actions workflow, retaining the existing custom domain and HTTPS. The private Sites audience remains unchanged.
- The owner completed GitHub App registration and installation on **only `kpdprojectsau/folder-1`**. Visitors need repository permission to edit; a public editor URL does not confer access. App credentials are encrypted in managed D1, not committed to source. Daily editing needs no additional paid service or account setup.

## End-to-end owner workflow verified

Owner sign-in, editing an existing job, saving and discarding an unpublished change, selecting a photo with the normal system file picker, saving that upload, setting workflow **Status → Ready**, and **Publish → Publish now** all completed in desktop Chrome.

The publish test was a real, content-preserving migration of the existing Epping staircase cover into the editor-managed upload folder. It did not invent a job, review or description. [CMS pull request 5](https://github.com/kpdprojectsau/folder-1/pull/5) was merged by the editor as commit `98b5b1ab0efb2e7350a5f32834d1473adc564ef7`. The only semantic project change was the cover-file reference. The uploaded file and retained original have identical SHA-256 `4b9cd062b8da3f4353968cb3bea9c88e784c6dc61dfae840cb9a114446269c85`. The editorial workflow had zero remaining draft/review/ready entries after publishing.

**Publication status** inside a job controls whether the public build includes it. The toolbar's **Status → Ready** controls approval of an edit. Both steps are explained in the guide. Publishing a change with Publication status Draft removes the job from public pages without deleting its saved content.

## Requirements verified

- Five actual jobs migrated to central JSON, retaining descriptions, images and useful URLs. No fabricated content.
- Three populated categories; multiple-category jobs appear once. Empty/hidden categories and drafts are excluded. Category names, order and visibility are content settings, not layout edits.
- Shared cards/detail pages, balanced featured selection, category filters, Load more, captions, optional details and before/after controls.
- Natural photo proportions and bounded staggered layouts, responsive WebP variants, no enlargement, orientation correction and metadata removal. JPEG/PNG/WebP upload guidance and actionable HEIC errors. Originals remain portable.
- Protected authenticated publishing and automatic build/image processing. Git history backs up JSON and original uploads; repository download/clone is a complete content backup.

## Automated and browser checks

- 11 image/config/build tests, including isolated mixed-shape uploads, orientation, deduplication, no upscaling, draft exclusion and empty/hidden categories.
- 13 editor authentication/security tests.
- 5 in-memory tests of the actual Apps Script source: quote/review mapping, redirects, no-write health/error paths and backend failures. No customer spreadsheet or email accessed.
- Build and local-link checks across all 11 generated HTML pages, five project pages and 65 optimised photo variants.
- Chromium and WebKit: 324 page/viewport checks in total. Portrait widths 320, 375, 390 and 430; landscape 667 and 844; tablets 768 and 1024; desktop 1440. Menus, filters, return position, galleries, keyboard/focus, comparison controls, mixed photo fixtures, Load more and no-JavaScript fallback passed.
- Safe form tests covered validation, retained values, payload mapping, duplicate prevention and success/failure recovery. Four locally intercepted POSTs; **zero live enquiries**. Production service responded to a non-submitting GET.

Screenshots are local under `output/playwright/`, excluded from commits. See `MOBILE_AUDIT.md` and `PHOTO_GUIDE.md` for details and repeatable checks.

## Honest limits and maintenance

- Browser-engine/device emulation is not physical iPhone or Android testing. Real notches and OS keyboard behavior remain worth checking on an actual phone.
- Live Google email/Sheet delivery was deliberately not exercised because no unsolicited live enquiry was authorised. Existing Google Apps Script code and endpoint are preserved. The existing form asks visitors to email photos separately; it does not claim to upload enquiry attachments.
- Routine CMS publishing updates the public website. The private review Site is separately deployed. Before a later code/private-site update, merge current GitHub `origin/main` to retain newly edited jobs and uploads.
- Keep `EDITOR_AUTH_KEY` and the existing GitHub App installation. Do not repeat initial registration when adding jobs. Re-authenticate normally when the eight-hour editor session expires.
