/**
 * LeadSimple Follow-Up Robot
 * --------------------------
 * Runs under the pmilighthouse-tasks@gmail.com account on a 1-minute trigger.
 * Any email forwarded to this inbox becomes an assigned "Email FollowUp"
 * process in LeadSimple, linked to the sender's record.
 *
 * Assignee comes from the plus-alias it was forwarded to:
 *   pmilighthouse-tasks+john@gmail.com  → John Ray Belen
 *   pmilighthouse-tasks+pam@gmail.com   → Pam Landman
 *   (no alias)                          → DEFAULT_ASSIGNEE
 *
 * Setup (one time):
 *   1. In this Apps Script project: Project Settings → Script Properties →
 *      add property LS_API_KEY = <LeadSimple REST API key>.
 *   2. Run processInbox once from the editor to grant permissions.
 *   3. Triggers (clock icon) → Add Trigger → processInbox, time-driven,
 *      minutes timer, every minute.
 */

const LS_BASE = "https://api.leadsimple.com/rest";
const FOLLOWUP_TYPE_RE = /email\s*follow/i;
const PHONE_SUBJECT_RE = /text message from\s*([+(]?[\d() .\-]{7,18}\d)/i;

// Alias (lowercase) → LeadSimple user. Edit this map to add/remove people.
const ASSIGNEES = {
  paul:   { id: "6582f65c-0bcf-443b-aff7-492e1cc963d2", name: "Paul Landman" },
  pam:    { id: "64d0e1b1-1e63-46d7-9db5-e2c262e229aa", name: "Pam Landman" },
  john:   { id: "627b9b8c-0d37-4af2-b67e-9ac4626dc0ee", name: "John Ray 2 Belen" },
  jasper: { id: "4205296e-d449-40d3-8046-0b5f2db35b6e", name: "Jasper Jed Belen" },
  ari:    { id: "fd7e3406-803a-40bd-8c03-3e4faaa64040", name: "Ari Kelhoffer" },
};
const DEFAULT_ASSIGNEE = "paul";

// Forwarder address → assignee key. Used when the forward has no +alias (or
// uses +me): the task goes to whoever forwarded it.
const SENDER_TO_ASSIGNEE = {
  "paul@pmilighthouse.com": "paul",
  "pland10@gmail.com": "paul",
  "pam@pmilighthouse.com": "pam",
  "johnray@pmilighthouse.com": "john",
  "johnray2@pmilighthouse.com": "john",
  "jasper@pmilighthouse.com": "jasper",
  "akelb01@outlook.com": "ari",
};

// Only mail FROM these senders becomes a follow-up; everything else (Google
// notifications, spam, direct outside mail) is labeled LS-Ignored and skipped.
const ALLOWED_FORWARDERS = /@pmilighthouse\.com|pland10@gmail\.com|akelb01@outlook\.com/i;

const DONE_LABEL = "LS-Created";
const FAIL_LABEL = "LS-Failed";
const SKIP_LABEL = "LS-Ignored";

// ─── Entry point (trigger) ────────────────────────────────────────────────────
function processInbox() {
  const done = getOrCreateLabel_(DONE_LABEL);
  const fail = getOrCreateLabel_(FAIL_LABEL);
  const skip = getOrCreateLabel_(SKIP_LABEL);
  const threads = GmailApp.search("in:inbox is:unread", 0, 20);

  for (const thread of threads) {
    for (const msg of thread.getMessages()) {
      if (!msg.isUnread()) continue;
      if (!ALLOWED_FORWARDERS.test(msg.getFrom())) {
        console.info(`Ignored (not a team forward): "${msg.getSubject()}" from ${msg.getFrom()}`);
        thread.addLabel(skip);
        msg.markRead();
        continue;
      }
      try {
        const result = handleMessage_(msg);
        thread.addLabel(done);
        msg.reply(
          `✓ Follow-up created: "${result.name}"\n` +
          `Assigned to: ${result.assignee}\n` +
          (result.dealName ? `Linked to: ${result.dealName}\n` : "") +
          (result.fileCount ? `Attachments saved: ${result.fileCount}\n` : "") +
          (result.link ? `\n${result.link}` : "")
        );
      } catch (e) {
        console.error(`Failed on "${msg.getSubject()}": ${e.message}`);
        thread.addLabel(fail);
        try {
          msg.reply(`⚠ Could NOT create a LeadSimple follow-up for "${msg.getSubject()}":\n${e.message}\n\nPlease create it manually or resend.`);
        } catch (_) {}
      }
      msg.markRead();
    }
    thread.moveToArchive();
  }
}

// ─── Per-message logic ────────────────────────────────────────────────────────
function handleMessage_(msg) {
  const assignee = resolveAssignee_(msg);
  const fwd = parseForwarded_(msg);
  const files = saveAttachments_(msg);
  const phone = (fwd.subject.match(PHONE_SUBJECT_RE) || [])[1] || null;

  // Look up the original sender's deal in LeadSimple
  let deal = null;
  const query = phone ? phone.trim() : fwd.senderEmail;
  if (query) {
    const deals = ls_("/deals?per_page=5&search=" + encodeURIComponent(query));
    if (deals.length === 0 && !phone && fwd.senderName) {
      const byName = ls_("/deals?per_page=5&search=" + encodeURIComponent(fwd.senderName));
      if (byName.length > 0) deal = byName[0];
    } else if (deals.length > 0) {
      deal = deals[0];
    }
  }
  const dealName = deal
    ? ((deal.contacts || []).map((c) => c.name).filter(Boolean).join(", ") || deal.name)
    : null;

  // Resolve the Email FollowUp process type + its working stage
  const types = ls_("/process_types?per_page=100");
  const type = types.find((t) => FOLLOWUP_TYPE_RE.test(t.name));
  if (!type) throw new Error('No "Email FollowUp" process type in LeadSimple');
  const stages = ls_(`/process_types/${type.id}/stages?per_page=50`);
  const stage = stages.find((s) => s.status === "working") || stages[0];

  // Create the process
  const noteLines = [
    phone ? `Phone: ${phone.trim()}` : null,
    !phone && fwd.senderEmail ? `From: ${fwd.senderName} <${fwd.senderEmail}>` : null,
    `Subject: ${fwd.subject}`,
    `Forwarded by: ${msg.getFrom()}`,
    "Source: Outlook forward",
    dealName ? `Record: ${dealName}${deal.link ? " — " + deal.link : ""}` : null,
    files.length ? `\nAttachments:\n${files.map((f) => `- ${f.name}: ${f.url}`).join("\n")}` : null,
    fwd.content ? `\n--- Message ---\n${fwd.content}` : null,
  ].filter(Boolean);

  const created = ls_("/processes", "POST", {
    process: {
      process_type_id: type.id,
      stage_id: stage.id,
      name: fwd.subject,
      comments: noteLines.join("\n"),
      user_id: assignee.id,
    },
  });

  // Note on the deal, pointing back at the follow-up
  if (deal) {
    try {
      ls_("/notes", "POST", {
        parent_id: deal.id,
        parent_type: "Deal",
        description:
          `Email follow-up created: ${fwd.subject}\nAssigned to: ${assignee.name}` +
          (created.link ? `\nProcess: ${created.link}` : ""),
      });
    } catch (e) {
      console.warn("Deal note failed (follow-up itself was created): " + e.message);
    }
  }

  console.info(`Created "${fwd.subject}" → ${assignee.name}${dealName ? " (linked to " + dealName + ")" : ""}`);
  return { name: fwd.subject, assignee: assignee.name, dealName, link: created.link || null, fileCount: files.length };
}

// ─── Save attachments to Drive, return shareable links ────────────────────────
// The LeadSimple API has no attachment upload, so files live in this account's
// Drive ("LS Follow-Up Attachments" folder) with view-by-link sharing, and the
// process notes carry the links.
function saveAttachments_(msg) {
  const atts = msg.getAttachments({ includeInlineImages: false, includeAttachments: true });
  if (atts.length === 0) return [];
  const folder = getOrCreateFolder_("LS Follow-Up Attachments");
  const out = [];
  for (const a of atts) {
    try {
      const file = folder.createFile(a.copyBlob());
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      out.push({ name: a.getName(), url: file.getUrl() });
    } catch (e) {
      console.warn(`Could not save attachment "${a.getName()}": ${e.message}`);
    }
  }
  return out;
}

function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

// ─── Assignee from plus-alias ─────────────────────────────────────────────────
function resolveAssignee_(msg) {
  const recipients = (msg.getTo() + "," + (msg.getCc() || "")).toLowerCase();
  const m = recipients.match(/\+([a-z0-9._-]+)@gmail\.com/);
  let key = m ? m[1] : null;

  // No alias, or explicit +me: assign to whoever forwarded it
  if (!key || key === "me" || !ASSIGNEES[key]) {
    const fromEmail = ((msg.getFrom().match(/<([^>]+)>/) || [])[1] || msg.getFrom()).toLowerCase().trim();
    key = SENDER_TO_ASSIGNEE[fromEmail] || DEFAULT_ASSIGNEE;
  }
  return ASSIGNEES[key] || ASSIGNEES[DEFAULT_ASSIGNEE];
}

// ─── Parse the forwarded email ────────────────────────────────────────────────
// Works with Outlook ("From: X <x@y>" header block) and Gmail
// ("---------- Forwarded message ---------") forward formats.
function parseForwarded_(msg) {
  const subject = msg.getSubject().replace(/^\s*(fwd?|fw)\s*:\s*/i, "").trim();
  const body = msg.getPlainBody() || "";

  // First "From:" line in the body is the original sender
  let senderName = "";
  let senderEmail = "";
  const fromLine = body.match(/^\s*From:\s*(.+)$/im);
  if (fromLine) {
    const raw = fromLine[1].trim();
    const angled = raw.match(/^(.*?)[<\[]\s*(?:mailto:)?([^>\]\s]+@[^>\]\s]+)\s*[>\]]/);
    if (angled) {
      senderName = angled[1].replace(/["']/g, "").trim();
      senderEmail = angled[2].trim();
    } else {
      const bare = raw.match(/([^\s]+@[^\s]+)/);
      if (bare) senderEmail = bare[1].replace(/[<>\[\]]/g, "");
      senderName = raw.replace(bare ? bare[1] : "", "").replace(/[<>\[\]"']/g, "").trim() || senderEmail;
    }
  }

  // Original message content: everything after the forward's header block
  // (the last of the From:/Sent:/Date:/To:/Cc:/Subject: lines near the top)
  let content = body;
  const headerBlock = body.match(/^\s*(?:From|Sent|Date|To|Cc|Subject):.*$(?:\r?\n^(?:From|Sent|Date|To|Cc|Subject|Reply-To):.*$)*/im);
  if (headerBlock) {
    content = body.slice(headerBlock.index + headerBlock[0].length);
  }
  content = content.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (content.length > 1500) content = content.slice(0, 1500) + "\n[…truncated]";

  return { subject, senderName, senderEmail, content };
}

// ─── LeadSimple API ───────────────────────────────────────────────────────────
function ls_(path, method, body) {
  const key = PropertiesService.getScriptProperties().getProperty("LS_API_KEY");
  if (!key) throw new Error("LS_API_KEY script property is not set");
  const res = UrlFetchApp.fetch(LS_BASE + path, {
    method: method || "get",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + key },
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`LeadSimple API ${code}: ${res.getContentText().slice(0, 200)}`);
  }
  const json = JSON.parse(res.getContentText());
  return json.data !== undefined ? json.data : json;
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
