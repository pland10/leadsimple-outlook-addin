# LeadSimple Lookup — Outlook Add-in

The Outlook version of the LeadSimple Gmail extension: a **LeadSimple Lookup**
button in the Outlook ribbon opens a task pane that looks up the open email's
sender (or the phone number in text-message notification subjects) in
LeadSimple and creates assigned **Email FollowUp** processes — same behavior as
Gmail extension v3.6, including linking the follow-up to the person's record.

## Architecture

- **Task pane** (`taskpane.html`): hosted on GitHub Pages at
  https://pland10.github.io/leadsimple-outlook-addin/taskpane.html
  (repo: pland10/leadsimple-outlook-addin). Supabase storage/functions can't
  host it — both rewrite text/html to text/plain as anti-phishing policy.
- **Edge function** (`supabase-function/ls-proxy.ts`, deployed as
  `leadsimple-outlook`, Verify JWT off): proxies LeadSimple API calls (the LS
  API sends no CORS headers, so the pane can't call it directly). Each user's
  LS token is entered in the pane's Settings and stored in localStorage; the
  proxy just passes it through.
- **manifest.xml**: the file users sideload into Outlook. Points at the
  GitHub Pages URLs.

## Hosting (already set up, July 2026)

- Edge function `leadsimple-outlook` deployed in Supabase, Verify JWT off.
- GitHub Pages enabled on pland10/leadsimple-outlook-addin (main, root).
- Smoke test: https://pland10.github.io/leadsimple-outlook-addin/taskpane.html

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

- **Task pane changes**: edit `taskpane.html`, commit, `git push` — GitHub
  Pages redeploys in ~1 minute. No user action needed.
- **Proxy changes**: re-paste `ls-proxy.ts` in the Supabase dashboard.
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
