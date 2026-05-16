# KPD Projects Google Apps Script Setup

This backend replaces the previous hosted form service for the KPD Projects static GitHub Pages website.

Review submissions are saved to this private Google Sheet:

```text
https://docs.google.com/spreadsheets/d/1MDwYgQkRcsIo_wGBkVDYeKNc7W20rUlsn2FPXJTkFX8/edit?gid=0#gid=0
```

## Deploy The Backend

1. Sign into Google using:

   ```text
   kpdprojectsau@gmail.com
   ```

2. Go to:

   ```text
   https://script.google.com/
   ```

3. Create a new Apps Script project.

4. Paste the contents of:

   ```text
   google-apps-script/Code.gs
   ```

   into the Apps Script editor.

5. Run:

   ```text
   setupKPDReviewSheet()
   ```

   This opens the configured review spreadsheet, creates or reuses the `Review Submissions` tab, adds the review headers, and stores the spreadsheet ID in Script Properties.

6. Approve the requested permissions. The signed-in Google account must have edit access to the review spreadsheet above.

7. Deploy as a Web App.

8. Use these deployment settings:

   ```text
   Execute as: Me
   Who has access: Anyone
   ```

   "Anyone" is required so the public website can submit the form, but the Google Sheet itself remains private and only accessible to `kpdprojectsau@gmail.com`, plus the Google account that owns the Apps Script if different.

9. Copy the Web App URL.

10. Paste the Web App URL into the website config value in:

   ```text
   script.js
   ```

   Replace:

   ```js
   const KPD_FORMS_ENDPOINT = "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```

   with the deployed Web App URL.

11. Commit and publish the website update.

## What The Backend Does

- Quote submissions are emailed to `kpdprojectsau@gmail.com`.
- Review submissions are saved to the configured private Google Sheet.
- Review submissions also send a notification email to `kpdprojectsau@gmail.com`.
- Submitted reviews are not automatically published on the website.
- After a successful submission, users are redirected to `https://kpdprojects.com.au/thanks.html`.
