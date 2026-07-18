# KPD Projects Website

Static GitHub Pages website for `https://kpdprojects.com.au/`.

## Included

- Concise homepage hero and responsive navigation
- Featured Gordon, Willoughby and Newtown projects using approved customer reviews
- Accessible before-and-after sliders for aligned photos
- Honest side-by-side treatment for the Willoughby photos, which use different viewpoints
- Recent jobs gallery using supplied project-stage photos
- Accessible quote form with inline validation and duplicate-submit protection
- Responsive 800px and 1400px project image variants, with originals retained as source assets
- Thank-you page and existing KPD Projects branding

## Enquiry Delivery

The quote form posts to the Google Apps Script Web App endpoint configured in `script.js`.

Quote enquiries are emailed to:

```text
kpdprojectsau@gmail.com
```

Quote submissions are saved to this private Google Sheet:

```text
https://docs.google.com/spreadsheets/d/1MDwYgQkRcsIo_wGBkVDYeKNc7W20rUlsn2FPXJTkFX8/edit?gid=0#gid=0
```

The public contact email shown on the site is:

```text
kpdprojectsau@gmail.com
```

Google Apps Script source and deployment instructions are in:

```text
google-apps-script/SETUP.md
```

The deployed Apps Script accepts text fields but does not store multipart file uploads. The website therefore keeps photo selection local, clearly tells visitors to email photos separately, and includes selected filenames in the enquiry details. No photo is silently presented as uploaded.

The live backend receives the new property type, urgency and preferred contact fields inside the brief description for backwards compatibility. The repository Apps Script source also has dedicated columns for these values for its next deployment.

## Deployment

This is a static GitHub Pages site served from the root of the `main` branch.

The form confirmation URL is:

```text
https://kpdprojects.com.au/thanks.html
```

Project facts, reviews and image roles originate from the supplied KPD Projects handoff manifest.
