# Google Sheets template for Meridian shadow review
# Spreadsheet: https://docs.google.com/spreadsheets/d/12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY/edit
# ID: 12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY
# Create five tabs and paste these header rows.
# Webhook: deploy docs/shadow-sheets-apps-script.js as a Web app from THIS sheet;
# SHEETS_WEBHOOK_URL = script.google.com/.../exec (never the spreadsheet edit URL).

## Tickets
Ticket ID	Created at	Created by	Page URL	Page path	Element type	Element label	CSS selector	Text snippet	Category	Priority	Status	Summary	Assigned to	Shadow fix URL	Live shipped URL	Closed at	Closed by	Last updated at	Last updated by

## Comments
Comment ID	Ticket ID	Created at	Author	Message	Visibility

## Audit_Log
Event ID	Timestamp	Actor	Action	Ticket ID	Comment ID	From status	To status	Page URL	Details	Source

## People
Name	Email	Role	Active
Katia Major	Katia.major@thameswellness.com	Owner	Yes
Raili Maripuu	raili.maripuu@thameswellness.com	Owner	Yes
Marko Tuisk	markotuisk@gmail.com	SEO & Dev	Yes
Meridian	system	Agent	Yes

## Assets
Asset ID	Ticket ID	Location ID	Filename	Drive URL	Page path	CSS selector	Current src	Uploaded by	Uploaded at	Mime type	Size bytes

## Status values
Open
Discussing
Accepted
On shadow
In progress
Ready for review
Approved
Shipped to live
Won't fix
Duplicate
Blocked

## Actions for Audit_Log
ticket_created
comment_added
status_changed
assigned
priority_changed
shadow_change_implemented
ready_for_review
approved
rejected
shipped_to_live
wont_fix
login
asset_uploaded
