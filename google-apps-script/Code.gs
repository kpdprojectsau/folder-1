const KPD_EMAIL = "kpdprojectsau@gmail.com";
const REVIEW_SHEET_NAME = "KPD Projects Review Submissions";
const THANKS_URL = "https://kpdprojects.com.au/thanks.html";
const REVIEW_SPREADSHEET_ID_PROPERTY = "KPD_REVIEW_SPREADSHEET_ID";
const REVIEW_SHEET_TAB_NAME = "Review Submissions";
const DEFAULT_SOURCE = "KPD Projects Website";
const REVIEW_HEADERS = [
  "Timestamp",
  "Name",
  "Email",
  "Star Rating",
  "Review Description",
  "Source",
];

function doPost(e) {
  const values = normalisePostValues_(e);
  const formType = valueFor_(values, "form_type").toLowerCase();

  if (formType === "quote") {
    handleQuoteSubmission_(values);
    return redirectToThanks_();
  }

  if (formType === "review") {
    handleReviewSubmission_(values);
    return redirectToThanks_();
  }

  return errorResponse_("The form type was not recognised.");
}

function doGet() {
  return redirectToThanks_();
}

function setupKPDReviewSheet() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(REVIEW_SPREADSHEET_ID_PROPERTY);
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    spreadsheet.setName(REVIEW_SHEET_NAME);
  } else {
    spreadsheet = SpreadsheetApp.create(REVIEW_SHEET_NAME);
    spreadsheetId = spreadsheet.getId();
    properties.setProperty(REVIEW_SPREADSHEET_ID_PROPERTY, spreadsheetId);
  }

  const sheet = getOrCreateReviewSheet_(spreadsheet);
  ensureReviewHeaders_(sheet);
  secureReviewSpreadsheet_(spreadsheet);

  return spreadsheet.getUrl();
}

function handleQuoteSubmission_(values) {
  const email = valueFor_(values, "email");
  const subject = "New KPD Projects Quote Enquiry";
  const body = [
    "New quote enquiry received from the KPD Projects website.",
    "",
    formatField_("Name", values, "name"),
    formatField_("Email", values, "email"),
    formatField_("Phone", values, "phone"),
    formatField_("Suburb", values, "suburb"),
    formatField_("Job Type", values, "job_type"),
    formatField_("Preferred Timeframe", values, "preferred_timeframe"),
    formatField_("Budget Range", values, "budget_range"),
    formatField_("Brief Description", values, "brief_description"),
    formatField_("Source", values, "source"),
    "Submitted At: " + new Date().toLocaleString(),
  ].join("\n");

  sendKPDMail_(subject, body, email);
}

function handleReviewSubmission_(values) {
  const spreadsheet = getReviewSpreadsheet_();
  const sheet = getOrCreateReviewSheet_(spreadsheet);
  ensureReviewHeaders_(sheet);

  const email = valueFor_(values, "email");
  const source = valueFor_(values, "source") || DEFAULT_SOURCE;

  sheet.appendRow([
    new Date(),
    valueFor_(values, "name"),
    email,
    valueFor_(values, "star_rating"),
    valueFor_(values, "review_description"),
    source,
  ]);

  const subject = "New KPD Projects Review Submission";
  const body = [
    "New review submission received from the KPD Projects website.",
    "",
    formatField_("Name", values, "name"),
    formatField_("Email", values, "email"),
    formatField_("Star Rating", values, "star_rating"),
    formatField_("Review Description", values, "review_description"),
    "Source: " + source,
    "Submitted At: " + new Date().toLocaleString(),
    "",
    "The review has been saved to the private Google Sheet.",
  ].join("\n");

  sendKPDMail_(subject, body, email);
}

function getReviewSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(REVIEW_SPREADSHEET_ID_PROPERTY);

  if (!spreadsheetId) {
    setupKPDReviewSheet();
    spreadsheetId = properties.getProperty(REVIEW_SPREADSHEET_ID_PROPERTY);
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getOrCreateReviewSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(REVIEW_SHEET_TAB_NAME);

  if (!sheet) {
    sheet = spreadsheet.getSheets()[0] || spreadsheet.insertSheet(REVIEW_SHEET_TAB_NAME);
    sheet.setName(REVIEW_SHEET_TAB_NAME);
  }

  return sheet;
}

function ensureReviewHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, REVIEW_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasHeaders = currentHeaders.some(function (value) {
    return String(value || "").trim() !== "";
  });

  if (!hasHeaders) {
    headerRange.setValues([REVIEW_HEADERS]);
  }

  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function secureReviewSpreadsheet_(spreadsheet) {
  const file = DriveApp.getFileById(spreadsheet.getId());
  const ownerEmail = file.getOwner().getEmail();
  const effectiveUserEmail = getEffectiveUserEmail_();

  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  file.addEditor(KPD_EMAIL);

  file.getEditors().forEach(function (editor) {
    const email = editor.getEmail();
    if (email !== KPD_EMAIL && email !== ownerEmail && email !== effectiveUserEmail) {
      file.removeEditor(editor);
    }
  });

  file.getViewers().forEach(function (viewer) {
    const email = viewer.getEmail();
    if (email !== KPD_EMAIL && email !== ownerEmail && email !== effectiveUserEmail) {
      file.removeViewer(viewer);
    }
  });
}

function sendKPDMail_(subject, body, replyTo) {
  const options = {
    to: KPD_EMAIL,
    subject: subject,
    body: body,
    name: "KPD Projects Website",
  };

  if (replyTo) {
    options.replyTo = replyTo;
  }

  MailApp.sendEmail(options);
}

function normalisePostValues_(e) {
  const raw = e && e.parameter ? e.parameter : {};
  const values = {};

  Object.keys(raw).forEach(function (key) {
    values[key] = String(raw[key] || "").trim();
  });

  return values;
}

function valueFor_(values, key) {
  return values[key] || "";
}

function formatField_(label, values, key) {
  return label + ": " + (valueFor_(values, key) || "Not provided");
}

function getEffectiveUserEmail_() {
  try {
    return Session.getEffectiveUser().getEmail();
  } catch (error) {
    return "";
  }
}

function redirectToThanks_() {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    '<meta http-equiv="refresh" content="0; url=' + THANKS_URL + '">',
    "<title>Redirecting...</title>",
    "<script>",
    "window.top.location.href = " + JSON.stringify(THANKS_URL) + ";",
    "</script>",
    "</head>",
    "<body>",
    '<p>Thanks. Redirecting to <a href="' + THANKS_URL + '">KPD Projects</a>.</p>',
    "</body>",
    "</html>",
  ].join("");

  return HtmlService.createHtmlOutput(html).setTitle("KPD Projects");
}

function errorResponse_(message) {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<title>KPD Projects Form Error</title>",
    "</head>",
    "<body>",
    "<p>" + message + "</p>",
    '<p>Please email <a href="mailto:' + KPD_EMAIL + '">' + KPD_EMAIL + "</a> directly.</p>",
    "</body>",
    "</html>",
  ].join("");

  return HtmlService.createHtmlOutput(html).setTitle("KPD Projects Form Error");
}
