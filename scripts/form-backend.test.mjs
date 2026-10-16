import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Execute the real Apps Script source with in-memory Sheets/Mail substitutes.
// No Google API, email, spreadsheet, live enquiry or network request is made.
const source = await readFile(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");
function backend({ mailFailure = false, sheetFailure = false } = {}) {
  const sheets = new Map();
  const emails = [];
  const makeSheet = () => ({
    rows: [], headers: [], frozen: 0,
    appendRow(row) { if (sheetFailure) throw new Error("Simulated sheet failure"); this.rows.push(row); },
    getRange() { return { setValues: values => { this.headers = values[0]; }, setFontWeight() {} }; },
    setFrozenRows(count) { this.frozen = count; },
    setName() {},
  });
  const spreadsheet = {
    getSheetByName: name => sheets.get(name),
    insertSheet(name) { const sheet = makeSheet(); sheets.set(name, sheet); return sheet; },
    getSheets: () => [...sheets.values()],
  };
  const context = vm.createContext({
    SpreadsheetApp: { openById: () => spreadsheet },
    MailApp: { sendEmail(message) { if (mailFailure) throw new Error("Simulated mail failure"); emails.push(message); } },
    HtmlService: { createHtmlOutput: html => ({ html, setTitle(title) { this.title = title; return this; } }) },
  });
  vm.runInContext(source, context);
  return { context, sheets, emails };
}
const quote = {
  form_type: "quote", name: " Local test only ", email: "test@example.invalid", phone: "0400000000",
  suburb: "Test fixture", job_type: "Tiling", preferred_timeframe: "Flexible", budget_range: "Discuss",
  brief_description: "Local test only; never submitted online.", source: "Local automated test",
  property_type: "House", urgency: "Not urgent", preferred_contact_method: "Email",
};

test("quote payload reaches the correct sheet columns, email and success URL", () => {
  const { context, sheets, emails } = backend();
  const response = context.doPost({ parameter: quote });
  const sheet = sheets.get("Quote Enquiries");
  assert.equal(sheet.headers.length, 13);
  assert.equal(sheet.frozen, 1);
  assert.equal(sheet.rows.length, 1);
  assert.deepEqual(Array.from(sheet.rows[0]).slice(1), ["Local test only", quote.email, quote.phone, quote.suburb, quote.job_type, quote.preferred_timeframe, quote.budget_range, quote.brief_description, quote.source, quote.property_type, quote.urgency, quote.preferred_contact_method]);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "kpdprojectsau@gmail.com");
  assert.equal(emails[0].replyTo, quote.email);
  assert.match(emails[0].body, /Property Type: House/);
  assert.match(response.html, /https:\/\/kpdprojects\.com\.au\/thanks\.html/);
});

test("review payload is stored privately and notified, not published as a testimonial", () => {
  const { context, sheets, emails } = backend();
  const response = context.doPost({ parameter: { form_type: "review", name: "Test fixture", email: "test@example.invalid", star_rating: "4", review_description: "In-memory test only." } });
  assert.equal(sheets.get("Review Submissions").rows.length, 1);
  assert.deepEqual(Array.from(sheets.get("Review Submissions").rows[0]).slice(1), ["Test fixture", "test@example.invalid", "4", "In-memory test only.", "KPD Projects Website"]);
  assert.equal(emails.length, 1);
  assert.match(response.html, /review-thank-you\.html/);
});

test("GET health check and unrecognised form types do not create enquiries", () => {
  const { context, sheets, emails } = backend();
  assert.match(context.doGet().html, /thanks\.html/);
  const response = context.doPost({ parameter: { form_type: "not-a-submission" } });
  assert.match(response.html, /form type was not recognised/);
  assert.match(response.html, /mailto:kpdprojectsau@gmail\.com/);
  assert.equal(sheets.size, 0);
  assert.equal(emails.length, 0);
});

test("sheet failures do not send a misleading notification or success redirect", () => {
  const { context, emails } = backend({ sheetFailure: true });
  assert.throws(() => context.doPost({ parameter: quote }), /Simulated sheet failure/);
  assert.equal(emails.length, 0);
});

test("mail failures remain errors rather than returning false success", () => {
  const { context, sheets, emails } = backend({ mailFailure: true });
  assert.throws(() => context.doPost({ parameter: quote }), /Simulated mail failure/);
  assert.equal(sheets.get("Quote Enquiries").rows.length, 1);
  assert.equal(emails.length, 0);
});
