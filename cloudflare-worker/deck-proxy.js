// Light-Paws deck-link proxy — Cloudflare Worker (free tier is plenty).
// Only fetches deck data from the three supported sites, and only answers the Light-Paws app.
const ALLOWED_TARGETS = ["archidekt.com", "api2.moxfield.com", "www.mtggoldfish.com", "mtggoldfish.com"];
const ALLOWED_ORIGINS = ["https://lightpaws.app", "https://www.lightpaws.app", "https://jrkline1116.github.io", "http://localhost:5173", "http://localhost:4173"];

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });

    const target = new URL(request.url).searchParams.get("url");
    let t;
    try { t = new URL(target); } catch { return new Response("Bad url", { status: 400, headers: cors }); }
    if (t.protocol !== "https:" || !ALLOWED_TARGETS.includes(t.hostname))
      return new Response("Host not allowed", { status: 403, headers: cors });

    const upstream = await fetch(t.toString(), {
      headers: { "User-Agent": "LightPawsCompanion/1.0 (+https://lightpaws.app/)", Accept: "application/json, text/plain, */*" },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": upstream.headers.get("Content-Type") || "text/plain; charset=utf-8" },
    });
  },
};
