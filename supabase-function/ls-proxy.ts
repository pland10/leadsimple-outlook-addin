// leadsimple-outlook — one function, two jobs:
//   GET  → serves the Outlook task pane HTML (stored in the outlook-addin
//          storage bucket; storage alone can't serve text/html, so we re-serve
//          it here with the right content type)
//   POST → proxies LeadSimple REST API calls (the LS API sends no CORS
//          headers, so the task pane can't call it directly). Only reaches
//          api.leadsimple.com/rest and passes through the caller's own
//          LeadSimple Bearer token.
// Deploy with "Verify JWT" turned OFF (the page must load without auth;
// the proxy is useless without a valid LeadSimple token anyway).

const TASKPANE_URL =
  "https://vpphjzvesgrihqavzyfu.supabase.co/storage/v1/object/public/outlook-addin/taskpane.html";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method === "GET") {
    const html = await fetch(TASKPANE_URL).then((r) => r.text());
    return new Response(html, {
      headers: { ...cors, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const { path, method = "GET", body = null } = await req.json();
    if (typeof path !== "string" || !path.startsWith("/") || path.includes("..")) {
      return new Response(JSON.stringify({ error: "bad path" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const auth = req.headers.get("authorization") || "";
    const res = await fetch(`https://api.leadsimple.com/rest${path}`, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
