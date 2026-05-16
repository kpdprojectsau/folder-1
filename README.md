# KPD Projects Website

Static GitHub Pages website for `https://kpdprojects.com.au/`.

## Included

- Homepage hero with trust points
- Services, why choose, process, about, service areas and contact sections
- Future-ready project gallery and client reviews sections
- Compliance/trust disclaimer
- Quote request form with photo upload field
- Thank-you page
- Instagram and TikTok social links
- Local hero image asset at `assets/kpd-projects-hero.png`
- Company logos at `assets/kpd-logo-light.jpeg` and `assets/kpd-logo-dark.jpeg`

## Enquiry Delivery

The quote and review forms post to a Google Apps Script Web App endpoint configured in `script.js`.

Quote enquiries are emailed to:

```text
kpdprojectsau@gmail.com
```

Quote and review submissions are saved to this private Google Sheet. Reviews are not automatically published on the website:

```text
https://docs.google.com/spreadsheets/d/1MDwYgQkRcsIo_wGBkVDYeKNc7W20rUlsn2FPXJTkFX8/edit?gid=0#gid=0
```

The public contact email shown on the site is:

```text
kpdprojectsau@gmail.com
```

Google Apps Script deployment instructions are in:

```text
google-apps-script/SETUP.md
```

The social call-to-action links point to:

```text
Instagram: https://www.instagram.com/kpd.projects?igsh=OG82MW1veHdzdWIy&utm_source=qr
TikTok: https://www.tiktok.com/@kpd.projects?_r=1&_t=ZS-96GnorOEDYo
```

## Deployment

This is a static GitHub Pages site served from the root of the `main` branch.

The form confirmation URL is:

```text
https://kpdprojects.com.au/thanks.html
```
