# LeadSimple Lookup — Outlook Add-in

The Outlook version of the LeadSimple Gmail extension: a **LeadSimple Lookup**
button in the Outlook ribbon opens a task pane that looks up the open email's
sender (or the phone number in text-message notification subjects) in
LeadSimple and creates assigned **Email FollowUp** processes — same behavior as
Gmail extension v3.6, including linking the follow-up to the person's record.

## Architecture

- **Task pane** (`taskpane.html`): hosted in the Supabase `outlook-addin`
  storage bucket, but *served* through the edge function (storage refuses to
  serve `text/html`).
- **Edge function** (`supabase-function/ls-proxy.ts`, deployed as
  `leadsimple-outlook`): GET serves the task pane; POST proxies LeadSimple API
  calls (the LS API sends no CORS headers, so the pane can't call it directly).
  Each user's LS token is entered in the pane's Settings and stored in
  localStorage; the proxy just passes it through.
- **manifest.xml**: the file users sideload into Outlook. Points at the
  function URL and the storage-hosted icons.

## One-time setup (Paul)

1. **Deploy the edge function**: Supabase dashboard → Edge Functions →
   Deploy new function → name it exactly `leadsimple-outlook` → paste the
   contents of `supabase-function/ls-proxy.ts` → deploy.
2. **Turn OFF "Verify JWT"** for this function (function → Details/Settings →
   uncheck "Enforce JWT verification"). The page must load without auth; the
   proxy is useless without a valid LeadSimple token anyway.
3. **Smoke test**: open
   `https://vpphjzvesgrihqavzyfu.supabase.co/functions/v1/leadsimple-outlook`
   in a browser — you should see the LeadSimple Lookup page.

## Per-user install

> ⚠️ Outlook add-ins only work when Outlook is connected to a
> Microsoft-hosted mailbox (Microsoft 365 / Exchange / outlook.com).
> They do NOT load for Gmail-via-IMAP accounts in Outlook.

1. In Outlook, open the add-ins dialog: **Home → Get Add-ins** (or go to
   https://aka.ms/olksideload, which opens it).
2. **My add-ins → Custom Addins → Add a custom add-in → Add from file…**
3. Pick `manifest.xml` from this folder. Accept the warning.
4. Open any email — click the **LeadSimple Lookup** button in the ribbon.
5. First time: expand **Settings** at the bottom of the pane, paste your
   LeadSimple API token (ask Paul), Save. Use the pin icon on the pane to keep
   it open across emails.

## Updating

- **Task pane changes**: edit `taskpane.html`, re-upload to the
  `outlook-addin` storage bucket (Content-Type `text/html`, upsert). No
  function redeploy, no user action needed — next pane open picks it up.
- **Proxy changes**: re-paste `ls-proxy.ts` in the dashboard.
- **Manifest changes** (rare): users must remove and re-add the add-in.

## Files

```
leadsimple-outlook-addin/
├── manifest.xml                    # Sideload this into Outlook
├── taskpane.html                   # The pane UI + logic (also in storage)
├── icon-16/32/80.png               # Ribbon icons (also in storage)
├── supabase-function/ls-proxy.ts   # Edge function source (paste in dashboard)
└── README.md                       # This file
```
