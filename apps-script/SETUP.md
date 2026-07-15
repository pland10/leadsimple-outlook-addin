# LeadSimple Follow-Up Robot — Setup

Forward any email to **pmilighthouse-tasks@gmail.com** (from Outlook, Gmail,
or a phone) and it becomes an assigned "Email FollowUp" process in LeadSimple,
linked to the sender's record. Add `+name` to pick the assignee:

| Forward to | Assigned to |
|---|---|
| pmilighthouse-tasks+john@gmail.com | John Ray Belen |
| pmilighthouse-tasks+pam@gmail.com | Pam Landman |
| pmilighthouse-tasks+jasper@gmail.com | Jasper Jed Belen |
| pmilighthouse-tasks+ari@gmail.com | Ari Kelhoffer |
| pmilighthouse-tasks@gmail.com (no alias) | Paul Landman |

## One-time setup (Paul, ~10 minutes)

1. **Create the account**: sign up for `pmilighthouse-tasks@gmail.com`
   (or whatever is available — if the name differs, that's fine, aliases
   still work; also update the Quick Step addresses below).
2. **Create the script**: while signed in as that account, go to
   https://script.google.com → New project → name it "LeadSimple Follow-Up
   Robot" → delete the starter code → paste all of `Code.gs`.
3. **Add the API key**: gear icon (Project Settings) → Script Properties →
   Add property → name `LS_API_KEY`, value = the LeadSimple REST API key.
4. **Grant permissions**: back in the editor, select `processInbox` in the
   toolbar dropdown → Run → approve the Gmail + external-request permissions
   ("unverified app" warning → Advanced → Go to project).
5. **Add the trigger**: clock icon (Triggers) → Add Trigger →
   function `processInbox` → time-driven → minutes timer → every minute.
6. **Test**: forward any email to the address, wait a minute, check
   LeadSimple. The inbox thread gets labeled `LS-Created` (or `LS-Failed`
   with details in the script's Executions log).

## Outlook Quick Step (each team member, ~1 minute)

1. Home tab → Quick Steps gallery → **Create New**.
2. Name: `LS Follow-Up → John` (etc.).
3. Action: **Forward** → To: `pmilighthouse-tasks+john@gmail.com`.
4. Optionally add a second action: **Mark as read**.
5. Repeat for the assignees you use most.

One click on the Quick Step = follow-up created. Works identically from
Gmail (just forward) and phones.

## Maintenance

- Assignee list lives in the `ASSIGNEES` map at the top of `Code.gs` —
  LeadSimple user IDs come from `GET /rest/users`.
- Failures are labeled `LS-Failed` in the robot's inbox; details in
  Apps Script → Executions.
- The LeadSimple API key can be rotated by updating the `LS_API_KEY`
  script property.
