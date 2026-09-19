# Project context for Claude

This is the cloud/web home for the **LeadSimple Lookup — Outlook Add-in**.
Any Claude Code web session (claude.ai/code) on any machine can pick up work
here. Read `README.md` first — it has the full architecture, hosting, install,
and update instructions. This file only adds what a fresh session needs.

## What this project is

An Outlook ribbon button ("LeadSimple Lookup") that opens a task pane, looks up
the open email's sender (or a phone number from text-notification subjects) in
LeadSimple, and creates assigned **Email FollowUp** processes. Port of the
LeadSimple Gmail extension v3.6.

## Where the pieces live

- `taskpane.html` — pane UI + logic. Hosted on **GitHub Pages** from `main`
  (root): https://pland10.github.io/leadsimple-outlook-addin/taskpane.html
- `supabase-function/ls-proxy.ts` — edge function `leadsimple-outlook`
  (Verify JWT off) that proxies LeadSimple API calls.
- `manifest.xml` — the file users sideload into Outlook.
- `apps-script/Code.gs` + `SETUP.md` — the Gmail-hosted-mailbox follow-up robot
  (Apps Script), for mailboxes where the Outlook add-in can't load.
- `icon-16/32/80.png` — ribbon icons.

## Deploy flow

- **Pane change**: edit `taskpane.html`, commit, push to `main` → GitHub Pages
  redeploys in ~1 min. No user action.
- **Proxy change**: paste `ls-proxy.ts` into the Supabase dashboard by hand.
- **Manifest change** (rare): users must remove and re-add the add-in.
- **Apps Script change**: paste `Code.gs` into the Apps Script project (see
  `apps-script/SETUP.md`).

## What a web session CANNOT do here (needs the local machine / a human)

- Sideload or test the add-in in real Outlook.
- Paste the edge function into the Supabase dashboard.
- Paste `Code.gs` into Apps Script.
- Anything requiring the LeadSimple API token (kept out of the repo; ask Paul).

A web session CAN: edit code, fix the pane/proxy/robot logic, update the
README, and push. The manual paste/sideload steps above are the human's part.

## Branch

Active dev branch for web sessions: `claude/web-setup-1m9co4`. Default is `main`
(GitHub Pages serves from `main`, so pane changes only go live once merged to
`main`).
