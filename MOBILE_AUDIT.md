# Mobile audit — reverified 17 October 2026

## Implemented

- Corrected the shared font reset so the intended system sans-serif font and readable line spacing apply throughout the site.
- Added safe-area spacing, smaller-screen heading sizes, touch targets, responsive filter grids, landscape layouts and scrollable mobile navigation. The menu closes on selection, outside tap, Escape and a change to desktop width.
- Preserved each project's original photo proportions in the detail view and mobile gallery. Enlarged photos support previous/next, keyboard, swipe, an obvious Close button and focus return. Loading failures show a useful message.
- Kept vertical page scrolling available over the before-and-after controls. Project return links retain the selected category and restore the portfolio's position when using history.
- Compressed the homepage hero from about 2.1 MB to a 137 KB mobile JPEG and 409 KB desktop JPEG. Added intrinsic photo dimensions, accurate responsive image width descriptors, main-image priority and lazy loading below the initial view.
- Improved field sizing and validation scrolling. Details survive validation, reloads and returning from a failed submission within the same tab. Repeated submission is blocked while sending; successful submission clears the saved draft. File selections are not retained after reload.
- Corrected the review thank-you layout and hidden-control styling. Email links remain tap-to-email. No published business phone number was available, so no phone number was invented.

## Verification completed

`npm run check` builds five published project pages and checks all eleven generated HTML pages for broken local references, including responsive image descriptors. Public visitors receive static HTML/CSS/JavaScript and optimised images; photo processing runs only during the build.

The current build was rechecked in isolated Playwright Chromium and WebKit sessions. Each engine passed 99 combinations: the homepage (including services, about and enquiry sections), full portfolio, all three category URLs, all five project pages and review thank-you page, at:

| Type | Viewports |
| --- | --- |
| Phone portrait | 320×568, 375×667, 390×844, 430×932 |
| Phone landscape | 667×375, 844×390 |
| Tablet | 768×1024, 1024×768 |
| Desktop | 1440×900 |

All 198 page/viewport checks passed without horizontal overflow. Both engines also passed 63 photo-layout checks each, for 324 page/viewport checks in total, plus mixed-shape fixtures, no-JavaScript responsive rows and Load more. Interactive checks passed for menu opening/closing/navigation, category counts and active state, category and scroll restoration, gallery navigation/close/focus return, comparison keyboard and pointer controls, validation errors, retained values, outgoing form payload, duplicate prevention, success and failure recovery. Four POSTs were intercepted locally across the two engines; zero live enquiries were sent. The existing service also responded correctly to a non-submitting GET request.

Additional Chromium touch emulation passed horizontal comparison dragging, vertical scrolling over comparisons and gallery swiping. A delayed hero image kept stable layout space; a delayed/failed gallery image showed its error message and remained closable. Text enlargement to 200% passed on the main page types. A reduced-height 390×400 viewport kept the enquiry description field below the fixed header. Mobile and desktop screenshots were visually reviewed.

## Limits and release notes

- These are browser viewport/touch tests, including WebKit with an iPhone user agent, not physical-device tests. Safe-area CSS, 16 px form inputs, browser zoom and reduced-motion support are included, but actual notches and operating-system keyboards still warrant a device check.
- Google Apps Script success/failure responses were mocked for safe testing. Live email/Sheet delivery was not exercised. The existing service still requires photos to be emailed separately, and redirects successful live requests to the main public domain.
- GitHub Pages Actions publishing, the existing custom domain/HTTPS and the repository-limited editor app are configured. The private Sites audience remains custom (owner plus the existing allowed viewer); it was not made public or changed to owner-only.
- Owner sign-in on both the public and private editors, editing an existing job, saving and deleting an unpublished edit, uploading through the standard system file picker, setting Status Ready and publishing that upload were verified in desktop Chrome. The visitor-site mobile checks do not claim a physical-phone CMS test.
- Five additional backend tests execute the real Apps Script source against in-memory Sheets/email substitutes. They verify quote/review payloads, redirects, no-write GET/error paths and failure behavior without accessing customer data or sending email.

Screenshots are kept locally in `output/playwright/` and excluded from source commits. The repeatable browser regression script is `scripts/mobile-browser-checks.js`.
