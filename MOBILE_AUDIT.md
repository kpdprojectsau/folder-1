# Mobile audit — 16 October 2026

## Implemented

- Corrected the shared font reset so the intended system sans-serif font and readable line spacing apply throughout the site.
- Added safe-area spacing, smaller-screen heading sizes, touch targets, responsive filter grids, landscape layouts and scrollable mobile navigation. The menu closes on selection, outside tap, Escape and a change to desktop width.
- Preserved each project's original photo proportions in the detail view and mobile gallery. Enlarged photos support previous/next, keyboard, swipe, an obvious Close button and focus return. Loading failures show a useful message.
- Kept vertical page scrolling available over the before-and-after controls. Project return links retain the selected category and restore the portfolio's position when using history.
- Compressed the homepage hero from about 2.1 MB to a 137 KB mobile JPEG and 409 KB desktop JPEG. Added intrinsic photo dimensions, accurate responsive image width descriptors, main-image priority and lazy loading below the initial view.
- Improved field sizing and validation scrolling. Details survive validation, reloads and returning from a failed submission within the same tab. Repeated submission is blocked while sending; successful submission clears the saved draft. File selections are not retained after reload.
- Corrected the review thank-you layout and hidden-control styling. Email links remain tap-to-email. No published business phone number was available, so no phone number was invented.

## Verification completed

`npm run check` builds five published project pages and checks all ten generated HTML pages for broken local references. JavaScript syntax and whitespace checks pass. No runtime dependencies were added.

Playwright in desktop Chromium tested 99 combinations: the homepage (including services, about and enquiry sections), full portfolio, all three category URLs, all five project pages and review thank-you page, at:

| Type | Viewports |
| --- | --- |
| Phone portrait | 320×568, 375×667, 390×844, 430×932 |
| Phone landscape | 667×375, 844×390 |
| Tablet | 768×1024, 1024×768 |
| Desktop | 1440×900 |

All 99 checks passed without horizontal overflow. Interactive checks passed for menu opening/closing/navigation, category counts and active state, category and scroll restoration, gallery navigation/close/focus return, comparison keyboard and pointer controls, validation errors, retained values, the outgoing form payload, duplicate prevention, successful confirmation and failure recovery. The form tests intercepted two POSTs locally; zero live enquiries were sent. The existing service also responded to a non-submitting GET request.

Additional Chromium touch emulation passed horizontal comparison dragging, vertical scrolling over comparisons and gallery swiping. A delayed hero image kept stable layout space; a delayed/failed gallery image showed its error message and remained closable. Text enlargement to 200% passed on the main page types. A reduced-height 390×400 viewport kept the enquiry description field below the fixed header. Mobile and desktop screenshots were visually reviewed.

## Limits and release notes

- These are browser viewport and touch-emulation tests, not physical-device, iPhone Safari or Android Chrome device tests. Safe-area CSS, 16 px form inputs, browser zoom and reduced-motion support are included, but actual notches and operating-system keyboards still warrant a device check.
- Google Apps Script success/failure responses were mocked for safe testing. Live email/Sheet delivery was not exercised. The existing service still requires photos to be emailed separately, and redirects successful live requests to the main public domain.
- The public-domain GitHub Pages rollout and Decap OAuth configuration still require the owner setup described in `README.md`. The Sites publication remains owner-private; this update does not change the audience.
- The external CMS login/editing workflow was not device-tested because its OAuth account setup is outstanding. Public project content remains separate from the layouts.

Screenshots are kept locally in `output/playwright/` and excluded from source commits. The repeatable browser regression script is `scripts/mobile-browser-checks.js`.
