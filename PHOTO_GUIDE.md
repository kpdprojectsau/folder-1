# Adding jobs with different photo shapes

The [job editor](https://kpdprojects.com.au/admin/) is connected. Adding photos is **upload once, preview, publish**.

1. Open **Completed projects → New completed project**. Enter the job details and select its categories.
2. Choose a cover photo and add gallery photos. Portrait, landscape and square photos can be mixed freely. Use JPEG, PNG or WebP files up to 12 MB each. If an iPhone photo is HEIC, export/share it as JPEG first.
3. Write a short description of each photo in its alternative text field; add a caption when useful.
4. Check the editor preview. Photos keep their proportions and fit within compact limits. No thumbnail files, crop settings or HTML changes are needed.
5. Keep **Publication status** as Draft until ready. To publish, set it to Published, save, then change the toolbar's **Status → Ready** and choose **Publish → Publish now**. Website image sizes are created during the build.

To replace a photo later, open the same job, choose the replacement, check its description, preview and publish again. Reordering gallery entries changes their display order. Selecting a different cover updates both the project card and project cover automatically.

Original files and project JSON remain the source of truth and can be backed up with the repository. Generated copies are compressed WebP files, automatically corrected for phone-camera rotation and stripped of embedded metadata. Small originals are never enlarged. Cards and gallery previews show complete photos within a maximum height of 360 px on desktop/tablet or 320 px on phones; tap a gallery photo to view the larger optimised copy.

The publishing build creates responsive sizes up to 400, 800, 1200 and 1600 px wide, capped at 2400 px on the longest edge. Repeated uses of the same file share generated copies. Missing, corrupt or unsupported photos stop the build with the affected job/file identified, preserving the currently published site.

Sign in with an authorized GitHub account. The secure connection may also ask you to sign in to the existing private Site. The owner account and repository-limited GitHub App are configured; ordinary job editing does not require creating another app or account. GitHub editing through a pull request remains an optional portable fallback, not a required daily workflow.

## Verification for this update

- Eleven image/editor-configuration/build tests cover portrait, landscape, square, panoramic, small and rotated sources, duplicate uploads, cached output, unsupported files, optional-field validation and adding a complete new job in an isolated test site. Drafts stay out of public pages and sitemaps; empty and hidden categories do not create blank sections.
- Browser geometry checks cover the homepage, full portfolio and all five project pages at 320, 375, 390 and 430 px phone widths, two landscape widths, tablet and desktop: 63 combinations.
- Local-only browser fixtures cover seven photo shapes, staggered packing without overlap, pagination and the JavaScript-disabled fallback. Existing menu, gallery, comparison, filter, return-position and mocked enquiry tests are retained.
- Screenshots are saved under `output/playwright/`. Browser checks use desktop Chromium emulation, not physical iPhone/Android devices. Test jobs and synthetic pictures are never added to the live portfolio.
