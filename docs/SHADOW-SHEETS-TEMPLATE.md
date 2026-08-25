# Google Sheets template for Meridian shadow review
# Create four tabs and paste these header rows.

## Tickets
Ticket ID	Created at	Created by	Page URL	Page path	Element type	Element label	CSS selector	Text snippet	Category	Priority	Status	Summary	Assigned to	Shadow fix URL	Live shipped URL	Closed at	Closed by	Last updated at	Last updated by

## Comments
Comment ID	Ticket ID	Created at	Author	Message	Visibility

## Audit_Log
Event ID	Timestamp	Actor	Action	Ticket ID	Comment ID	From status	To status	Page URL	Details	Source

## People
Name	Email	Role	Active
Katia Major		Owner	Yes
Raili Maripuu		Owner	Yes
Marko Tuisk		SEO & Dev	Yes
Meridian	system	Agent	Yes

## Status values
Open
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
