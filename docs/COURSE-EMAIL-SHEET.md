# Course email automation · Google Sheet

One Google Sheet stores course interest and paid participants. Website forms write **Interested** rows. Staff mark **Paid** (or call `/api/course/mark-paid`). A daily cron sends reminders 14, 7 and 3 days before `CourseStartDate`.

## Live spreadsheet

| | |
|--|--|
| Title | Rimender Automations (TWA course leads) |
| Spreadsheet ID | `1RpJ-Opimnhr4-khVEDNgM8ZWkVUYsSNiRHG8gAQpLg8` |
| Link | https://docs.google.com/spreadsheets/d/1RpJ-Opimnhr4-khVEDNgM8ZWkVUYsSNiRHG8gAQpLg8/edit |

**Production path:** Pages uses the Google Sheets API with `COURSE_SHEETS_SPREADSHEET_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`. Share the Sheet as **Editor** with the service account client email. Apps Script (`COURSE_SHEETS_WEBHOOK_URL`) remains an optional fallback.

## Sheet tabs

### Leads

| Column | Notes |
|--------|--------|
| Timestamp | ISO time of first insert |
| Name | Visitor name |
| Email | Lowercase |
| Phone | Optional |
| CourseSlug | e.g. `foundation-200` |
| CourseTitle | Human title / topic |
| Source | Form id (`contact`, `join`, …) |
| Message | Free text |
| Status | `Interested` · `Paid` · `Cancelled` |
| CourseStartDate | `YYYY-MM-DD` (required for reminders) |
| Reminder14Sent | ISO when −14 mail sent |
| Reminder7Sent | ISO when −7 mail sent |
| Reminder3Sent | ISO when −3 mail sent |
| PaidAt | ISO when marked paid |
| Notes | Free text |
| Page | Source URL |

Upsert key: **Email + CourseSlug**.

### Courses (optional)

Slug · Title · StartDate · Venue — reference for staff; lead row still needs its own `CourseStartDate` for the cron.

## Pages secrets (Sheets API · preferred)

| Secret | Purpose |
|--------|---------|
| `COURSE_SHEETS_SPREADSHEET_ID` | Spreadsheet id above |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service account JSON (Sheets write scope) |
| `COURSE_SHEETS_SECRET` | Auth for `/api/course/mark-paid` |
| `CRON_SECRET` | Auth for `/api/cron/course-reminders` |
| `RESEND_API_KEY` | Visitor + staff email |

```bash
npx wrangler pages secret put COURSE_SHEETS_SPREADSHEET_ID --project-name=berkshire-yoga-training
npx wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_JSON --project-name=berkshire-yoga-training
```

## Apps Script (optional fallback)

1. Open the live Sheet → Extensions → Apps Script.
2. Paste [`course-sheets-apps-script.js`](./course-sheets-apps-script.js) into Apps Script `Code.gs`.
3. Script property `COURSE_SHEETS_SECRET` = same as Pages secret.
4. Deploy as Web app (Execute as Me, Anyone).
5. Set Pages secret `COURSE_SHEETS_WEBHOOK_URL` to the `/exec` URL (used only when spreadsheet id / SA JSON are not set).

## Marking paid

**In Sheet:** set Status to `Paid` and fill `CourseStartDate`. Then either wait for cron only, or call the API to also send the payment confirmation email:

```bash
curl -X POST https://thameswellnessacademy.co.uk/api/course/mark-paid \
  -H "Authorization: Bearer $COURSE_SHEETS_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"person@example.com","courseSlug":"foundation-200","courseTitle":"Foundation 200","courseStartDate":"2027-02-12"}'
```

## Reminders cron

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://thameswellnessacademy.co.uk/api/cron/course-reminders"
```

Schedule daily ~08:00 Europe/London (Cloudflare Cron Trigger or any HTTPS cron).

## Emails

| Event | To | From |
|-------|-----|------|
| Form submit | Visitor | `noreply@thameswellnessacademy.co.uk` |
| Form submit | Raili + Katia | same |
| Mark paid (API) | Visitor | same |
| Reminder 14/7/3 | Paid visitor | same |

Reply-To on visitor mail: `contact@thameswellness.com`.

### Visitor email contents

Each customer-facing message includes:

- Course title, short summary, key facts, and a **View course page** button (from the course catalogue)
- **Academy contacts:** Katia Major and Raili Maripuu (co-founders) with emails, plus `contact@thameswellness.com`
- **Add to calendar:** Apple Calendar, Google / Android, and `.ics` download when a start date is known
- **QR codes:** save Academy contact (vCard) · add event (ICS URL)

Endpoints used by those links/QRs:

- Contact card: `GET /api/contacts/academy`
- Calendar file: `GET /api/calendar/course?slug=…&start=…`
