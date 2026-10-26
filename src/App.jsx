import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import {
  Feather, Sword, Swords, Eye, EyeOff, Heart, ShieldCheck, ShieldHalf, Gem,
  Sparkles, Search, Upload, Layers, Database, Plus, Minus, X, Star, RotateCcw, Check, Lock, Filter, Wand2, ChevronsRight,
  HelpCircle, MessageSquare, Settings, Download, Trash2, ChevronDown, ChevronRight, ChevronLeft, Info, BarChart3, FileUp, Copy, ShoppingCart, ExternalLink,
  Skull, Pencil, Undo2, Users, Target,
} from "lucide-react";

// Breastplate icon for Totem (umbra) armor, drawn in lucide's style so it takes the same props.
function ArmorIcon({ size = 24, strokeWidth = 2, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={style} className={className} aria-hidden="true">
      <path d="M7 3 4 5l1 5 3-1v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9l3 1 1-5-3-2c-1.5 1.6-8.5 1.6-10 0Z" />
      <path d="M12 7v13" />
      <path d="M8 13c2.5 1 5.5 1 8 0" />
    </svg>
  );
}

// Text colors: gold means "tap me". Static labels use the muted tone so they never look like buttons.
const HDR = "#a39b88";

/* ============================================================
   CONFIG — fill these in, then rebuild. Leave "" to hide.
   ============================================================ */
const DONATE_URL = "https://buymeacoffee.com/jrkline1116";   // e.g. "https://ko-fi.com/yourname"
const FEEDBACK_URL = "https://forms.gle/ESrGxf4UJ7nFg9Nm9";      // Google Form link — the Feedback button appears once this is set
const GOATCOUNTER_CODE = "lightpaws";  // GoatCounter site code, e.g. "lightpaws" — analytics turn on once this is set
const SITE_URL = "https://lightpaws.app/";
const APP_VERSION = "2026.10.26";
// TCGplayer affiliate (Impact). Leave "" to hide every Buy button.
const AFFILIATE_TCGPLAYER = "https://partner.tcgplayer.com/c/7855069/1780961/21018?partnerpropertyid=8916392";

/* ---- privacy-friendly analytics (GoatCounter: no cookies, no personal data) ---- */
// Opt-out uses GoatCounter's own "skipgc" flag, so count.js honors it too.
function analyticsOn() { try { return localStorage.getItem("skipgc") !== "t"; } catch { return true; } }
function setAnalyticsOn(on) { try { on ? localStorage.removeItem("skipgc") : localStorage.setItem("skipgc", "t"); } catch {} }
let _gcLoaded = false;
function loadAnalytics() {
  if (!GOATCOUNTER_CODE || _gcLoaded || typeof document === "undefined" || !analyticsOn()) return;
  _gcLoaded = true;
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://gc.zgo.at/count.js";
  sc.setAttribute("data-goatcounter", `https://${GOATCOUNTER_CODE}.goatcounter.com/count`);
  document.head.appendChild(sc);
}
// Anonymous event counts (which tabs get used, import sources, tour finish/skip)
function track(name) {
  if (!GOATCOUNTER_CODE || !analyticsOn()) return;
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch {}
}

/* ---- first-run guided tour ---- */
const TOUR_STEPS = [
  { tab: 4, title: "Deck — start here", body: "A sample deck is loaded so you can try everything now. Paste your own deck link from Archidekt, Moxfield or MTGGoldfish (or the full list) and your printings come with it. View list lets you add or remove cards and mark sideboard cards." },
  { tab: 1, title: "Cast — your hand", body: "Add the cards you're holding (tap the box to browse) and set your mana. You'll get the best play for that mana, and can cast right from here." },
  { tab: 2, title: "Fetch — Light-Paws' tutor", body: "After you cast an Aura, pick its mana value to see every Aura you can fetch, ranked best-first. One tap adds it." },
  { tab: 3, title: "Board — everything else", body: "Your mana and the other permanents you control. Cost reducers like Danitha and draw engines feed the Cast tab automatically." },
  { tab: 0, title: "Active — Light-Paws right now", body: "Live power/toughness, keywords, protection and +1/+1 counters (tap the ring around Light-Paws). Track each opponent's life, split damage between them, and see what's in your graveyard." },
];
const AD_CLIENT  = "";   // AdSense publisher id, e.g. "ca-pub-0000000000000000"
const AD_SLOT    = "";   // AdSense ad-unit slot id, e.g. "1234567890"
// Optional deck-link proxy (see cloudflare-worker/README.md). Used only when a site blocks
// direct browser requests. e.g. "https://light-paws-proxy.yourname.workers.dev"
const DECK_PROXY_URL = "https://light-paws-proxy.jrkline1116.workers.dev";

/* ============================================================
   LIGHT-PAWS COMPANION
   Tabs: Board · Play · Deck · All Auras
   ============================================================ */

// ---- scoring constants ----
const P_VAL = 1.0, T_VAL = 0.5, DRAW_VAL = 1, TOKEN_NOW = 1.5, TOKEN_COND = 0.75, ETB_REMOVAL = 3;
const LETHAL_BONUS = 25;  // a play that reaches the lethal threshold dominates everything else
const CONNECT_EVASIVE = 0.85, CONNECT_GROUND = 0.45;

// ---- keyword metadata (order = ring order, starting top, clockwise) ----
const KW = {
  flying:        { label: "Flying",        w: 2, Icon: Feather },
  doubleStrike:  { label: "Double strike", w: 4, Icon: Swords },
  trample:       { label: "Trample",       w: 2, Icon: ChevronsRight },
  firstStrike:   { label: "First strike",  w: 2, Icon: Sword },
  vigilance:     { label: "Vigilance",     w: 2, Icon: Eye },
  lifelink:      { label: "Lifelink",      w: 3, Icon: Heart },
  protection:    { label: "Protection",    w: 3, Icon: ShieldHalf },
  hexproof:      { label: "Hexproof",      w: 4, Icon: EyeOff },
  indestructible:{ label: "Indestructible",w: 4, Icon: Gem },
  ward:          { label: "Ward",          w: 2, Icon: ShieldCheck },
  totemArmor:    { label: "Totem armor",   w: 3, Icon: ArmorIcon },
};
const KW_ORDER = Object.keys(KW);

// default scoring weights (users can override these in the app; persisted)
const DEFAULT_WEIGHTS = {
  ...Object.fromEntries(Object.keys(KW).map((k) => [k, KW[k].w])),
  P_VAL, T_VAL, DRAW_VAL, TOKEN_NOW, TOKEN_COND, ETB_REMOVAL, CONNECT_EVASIVE, CONNECT_GROUND, LETHAL_BONUS,
};

const COLORS = [
  { key: "white", label: "White", hex: "#f3ead0", fg: "#6b5212" },
  { key: "blue",  label: "Blue",  hex: "#3b7fc4", fg: "#ffffff" },
  { key: "black", label: "Black", hex: "#4b4b52", fg: "#ffffff" },
  { key: "red",   label: "Red",   hex: "#c8443b", fg: "#ffffff" },
  { key: "green", label: "Green", hex: "#3d8a52", fg: "#ffffff" },
];
const colorLabel = (k) => { const c = COLORS.find((x) => x.key === k); return c ? c.label : k; };

// matches an aura by mana value (bare number), name, keyword labels, or note
function auraMatchesText(a, q) {
  if (!q) return true;
  const raw = q.trim();
  if (/^\d+$/.test(raw)) return a.cmc === parseInt(raw, 10);   // "2" -> all 2-cost auras
  const n = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!n) return true;
  if (a.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(n)) return true;
  if (a.kw && a.kw.some((k) => (KW[k] ? KW[k].label : k).toLowerCase().replace(/[^a-z0-9]/g, "").includes(n) || k.toLowerCase().includes(n))) return true;
  if (a.note && a.note.toLowerCase().replace(/[^a-z0-9]/g, "").includes(n)) return true;
  return false;
}

function hasKw(have, kw) {
  if (have.has(kw)) return true;
  if (kw === "firstStrike" && have.has("doubleStrike")) return true;
  if (kw === "totemArmor" && have.has("indestructible")) return true;
  return false;
}

// ---- aura library ----------------------------------------------------------
const A = (id, name, c, w, o = {}) => ({
  id, name, cost: { c, w }, cmc: c + w,
  kw: o.kw || [], stat: o.stat || null, scale: o.scale || null,
  draw: o.draw || 0, token: o.token || null, etbRemoval: !!o.etbRemoval,
  conditional: !!o.conditional, canRide: o.canRide !== false, evasion: !!o.evasion,
  buff: o.buff !== false, note: o.note || "", flash: !!o.flash, deck: !!o.deck, prot: o.prot || null,
  toHand: !!o.toHand, recur: o.recur || "",
});

const LIBRARY = [
  // ---- the 33 in the current deck (deck:true) ----
  A("cartouche","Cartouche of Solidarity",0,1,{deck:1,kw:["firstStrike"],stat:{p:1,t:1},token:"now",note:"ETB: 1/1 Warrior"}),
  A("ethereal","Ethereal Armor",0,1,{deck:1,kw:["firstStrike"],scale:"ethereal",note:"+1/+1 per enchantment you control"}),
  A("hyena","Hyena Umbra",0,1,{deck:1,kw:["firstStrike","totemArmor"],stat:{p:1,t:1}}),
  A("raffine","Raffine's Guidance",0,1,{deck:1,stat:{p:1,t:1},note:"Recast from GY 2W",recur:"Cast from graveyard for {2}{W}"}),
  A("sentinel","Sentinel's Eyes",0,1,{deck:1,kw:["vigilance"],stat:{p:1,t:1},note:"Escape",recur:"Escape: cast it from your graveyard"}),
  A("shardmage","Shardmage's Rescue",0,1,{deck:1,kw:["hexproof"],stat:{p:1,t:1},flash:1,note:"Hexproof only the turn it enters"}),
  A("glitters","All That Glitters",1,1,{deck:1,scale:"atg",note:"+1/+1 per artifact + enchantment"}),
  A("angelic","Angelic Gift",1,1,{deck:1,kw:["flying"],draw:1}),
  A("benevolent","Benevolent Blessing",1,1,{deck:1,kw:["protection"],prot:"choice",flash:1,note:"Protection: chosen color"}),
  A("dogumbra","Dog Umbra",1,1,{deck:1,kw:["totemArmor"],flash:1,note:"On an opponent: it can't attack/block"}),
  A("feather","Feather of Flight",1,1,{deck:1,kw:["flying"],stat:{p:1,t:0},draw:1,flash:1}),
  A("gryff","Gryff's Boon",1,1,{deck:1,kw:["flying"],note:"Recast from GY 3W",recur:"Cast from graveyard for {3}{W}"}),
  A("indomitable","Indomitable Will",1,1,{deck:1,stat:{p:1,t:2},flash:1}),
  A("serra","On Serra's Wings",3,1,{deck:1,kw:["flying","vigilance","lifelink"],stat:{p:1,t:1}}),
  A("pentarch","Pentarch Ward",1,1,{deck:1,kw:["protection"],prot:"choice",draw:1,note:"Protection: chosen color"}),
  A("rune","Rune of Sustenance",1,1,{deck:1,kw:["lifelink"],draw:1}),
  A("spectral","Spectral Steel",1,1,{deck:1,stat:{p:2,t:2},note:"1W, exile from GY: return an Aura/Equipment to hand",recur:"{1}{W}, exile it: return an Aura or Equipment from your graveyard to hand"}),
  A("twinblade","Twinblade Blessing",1,2,{deck:1,kw:["doubleStrike"],flash:1}),
  A("battle","Battle Mastery",2,1,{deck:1,kw:["doubleStrike"]}),
  A("chains","Chains of Custody",2,1,{deck:1,kw:["ward"],etbRemoval:1,note:"ETB: exile a nonland permanent an opponent controls"}),
  A("face","Face of Divinity",2,1,{deck:1,kw:["firstStrike","lifelink"],stat:{p:2,t:2},conditional:1,note:"First strike + lifelink only while a 2nd Aura is attached"}),
  A("griffin","Griffin Guide",2,1,{deck:1,kw:["flying"],stat:{p:2,t:2},token:"cond",note:"Dies -> 2/2 flying Griffin"}),
  A("vow","Vow of Duty",2,1,{deck:1,kw:["vigilance"],stat:{p:0,t:3},note:"Also: can't attack you"}),
  A("armored","Armored Ascension",3,1,{deck:1,kw:["flying"],scale:"armored",note:"+1/+1 per Plains you control"}),
  A("commanding","Commanding Presence",3,1,{deck:1,kw:["firstStrike"],stat:{p:2,t:2},token:"cond",note:"Combat dmg -> 1/1 Soldier"}),
  A("sage","Sage's Reverie",3,1,{deck:1,scale:"sage",draw:"sage",note:"+1/+1 & draw 1 per Aura you control"}),
  A("holy","Holy Mantle",2,2,{deck:1,kw:["protection"],prot:"creatures",stat:{p:2,t:2},evasion:1,note:"Protection from creatures"}),
  A("reprobation","Reprobation",1,1,{deck:1,buff:0,note:"Enchanted creature is 0/1, loses all abilities"}),
  A("dimensional","Dimensional Exile",1,1,{deck:1,buff:0,canRide:0,note:"Enchant your land; exile an opponent's creature"}),
  A("tenuous","Tenuous Truce",1,1,{deck:1,buff:0,canRide:0,note:"Enchant opponent; you both draw each of their end steps"}),
  A("arrest","Arrest",2,1,{deck:1,buff:0,note:"Can't attack, block, or use activated abilities"}),
  A("minimus","Minimus Containment",2,1,{deck:1,buff:0,note:"Permanent loses abilities, becomes a mana-Treasure"}),
  A("redemption","Redemption Arc",2,1,{deck:1,buff:0,note:"Indestructible + goaded; 1W: exile enchanted creature"}),

  // ---- other notable white Light-Paws auras (not in deck by default) ----
  A("spiritmantle","Spirit Mantle",1,1,{kw:["protection"],prot:"creatures",stat:{p:1,t:1},evasion:1,note:"Protection from creatures (near-unblockable)"}),
  A("unquestioned","Unquestioned Authority",2,1,{kw:["protection"],prot:"creatures",draw:1,evasion:1,note:"Protection from creatures; ETB draw"}),
  A("daybreak","Daybreak Coronet",0,2,{kw:["firstStrike","vigilance","lifelink"],stat:{p:3,t:3},conditional:1,note:"Enchant a creature that already has an Aura"}),
  A("angelicdestiny","Angelic Destiny",2,2,{kw:["flying","firstStrike"],stat:{p:4,t:4},note:"Becomes an Angel; returns to hand if the creature dies"}),
  A("flickering","Flickering Ward",0,1,{kw:["protection"],prot:"choice",note:"Protection: chosen color; W: return to hand"}),
  A("serrasembrace","Serra's Embrace",2,2,{kw:["flying","vigilance"],stat:{p:2,t:2}}),
  A("felidar","Felidar Umbra",1,1,{kw:["lifelink","totemArmor"],note:"Lifelink + totem armor; can move to another creature"}),
  A("shielded","Shielded by Faith",1,2,{kw:["indestructible"],note:"Indestructible; can move to creatures that enter"}),
  A("giftimmort","Gift of Immortality",2,1,{note:"When the creature dies, return it + reattach Gift"}),
  A("timelyward","Timely Ward",2,1,{kw:["indestructible"],flash:1,note:"Flash if it targets a commander"}),
  A("sheltered","Sheltered by Ghosts",1,1,{kw:["lifelink","ward"],stat:{p:1,t:0},etbRemoval:1,note:"+1/+0, lifelink, ward 2; ETB exile a permanent an opponent controls"}),
  A("pacifism","Pacifism",1,1,{buff:0,note:"Can't attack or block"}),
  A("faithsfetters","Faith's Fetters",3,1,{buff:0,note:"Can't attack/block/activate; gain 4 life"}),
  A("ossification","Ossification",1,1,{buff:0,canRide:0,note:"Enchant your land; exile a creature or planeswalker"}),
  A("cageofhands","Cage of Hands",1,1,{buff:0,note:"Can't attack/block; return to hand for 1W"}),
  A("prisonterm","Prison Term",1,2,{buff:0,note:"Can't attack/block/activate; can move to new threats"}),
  // --- verified additions (popular EDHREC auras) ---
  A("mantleancients","Mantle of the Ancients",3,2,{scale:"sage",note:"+1/+1 per Aura/Equipment attached; ETB returns Auras/Equipment from your graveyard"}),
  A("masklawgrace","Mask of Law and Grace",0,1,{kw:["protection"],note:"Protection from two colors (see card)"}),
  A("shielddutyreason","Shield of Duty and Reason",0,1,{kw:["protection"],note:"Protection from two colors (see card)"}),
  A("spiritlink","Spirit Link",0,1,{kw:["lifelink"],note:"Whenever enchanted creature deals damage, you gain that much life"}),
  A("spiritloop","Spirit Loop",1,1,{kw:["lifelink"],toHand:1,note:"Gain life equal to damage dealt; returns to your hand if it goes to the graveyard"}),
  A("sunbond","Sunbond",3,1,{note:"Whenever you gain life, put that many +1/+1 counters on Light-Paws (not auto-scored — use lifegain judgment)"}),
];

const byId = Object.fromEntries(LIBRARY.map((a) => [a.id, a]));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---- deck links: Archidekt / Moxfield / MTGGoldfish → plain decklist text ---- */
const URL_RE = /^https?:\/\/\S+$/i;
function deckCount(d) { if (!d) return 0; if (d.count) return d.count; return (d.all || []).reduce((n, c) => n + (c.qty || 1), 0); }
function isDeckUrl(t) { const x = (t || "").trim(); return URL_RE.test(x) && !/\s/.test(x); }

function parseDeckUrl(raw) {
  let u; try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);
  if (host === "archidekt.com" && parts[0] === "decks" && /^\d+$/.test(parts[1] || ""))
    return { site: "Archidekt", kind: "json", api: `https://archidekt.com/api/decks/${parts[1]}/` };
  if (host === "moxfield.com" && parts[0] === "decks" && parts[1])
    return { site: "Moxfield", kind: "json", api: `https://api2.moxfield.com/v3/decks/all/${parts[1]}` };
  if (host === "mtggoldfish.com" && parts[0] === "deck") {
    const id = parts[1] === "download" ? parts[2] : parts[1];
    if (/^\d+$/.test(id || "")) return { site: "MTGGoldfish", kind: "text", api: `https://www.mtggoldfish.com/deck/download/${id}` };
  }
  return { site: null };
}

// Archidekt: skip cards whose category is excluded from the deck (Maybeboard, Sideboard, etc.)
function archidektToText(d) {
  const excluded = new Set((d.categories || []).filter((c) => c.includedInDeck === false).map((c) => c.name));
  const lines = [];
  (d.cards || []).forEach((e) => {
    const nm = e.card && e.card.oracleCard && e.card.oracleCard.name;
    if (!nm) return;
    const cats = e.categories || [];
    if (cats.length && excluded.has(cats[0])) return;
    const ed = e.card && e.card.edition && e.card.edition.editioncode;
    const cn = e.card && e.card.collectorNumber;
    lines.push(`${e.quantity || 1} ${nm}${ed ? ` (${ed})${cn ? " " + cn : ""}` : ""}`);   // keep the printing chosen on Archidekt
  });
  return { text: lines.join("\n"), name: d.name || "" };
}

// Moxfield: commanders + mainboard (+ companions); ignore sideboard/maybeboard
function moxfieldToText(d) {
  const b = d.boards || {};
  const lines = [];
  ["commanders", "companions", "mainboard"].forEach((k) => {
    const cards = (b[k] && b[k].cards) || {};
    Object.values(cards).forEach((e) => {
      if (!e || !e.card || !e.card.name) return;
      const set = e.card.set, cn = e.card.cn;                                   // keep the printing chosen on Moxfield
      lines.push(`${e.quantity || 1} ${e.card.name}${set ? ` (${set})${cn ? " " + cn : ""}` : ""}`);
    });
  });
  return { text: lines.join("\n"), name: d.name || "" };
}

async function fetchVia(url, kind) {
  const attempts = [url];
  if (DECK_PROXY_URL) attempts.push(DECK_PROXY_URL.replace(/\/$/, "") + "/?url=" + encodeURIComponent(url));
  let lastErr = null;
  for (const a of attempts) {
    try {
      const r = await fetch(a, { headers: { Accept: kind === "json" ? "application/json" : "text/plain" } });
      if (r.status === 404) throw Object.assign(new Error("notfound"), { code: 404 });
      if (!r.ok) { lastErr = new Error("http " + r.status); continue; }
      return kind === "json" ? await r.json() : await r.text();
    } catch (e) { if (e.code === 404) throw e; lastErr = e; }
  }
  throw lastErr || new Error("failed");
}

// Returns { text, name, site } or throws Error with a user-facing message.
async function deckFromUrl(raw) {
  const info = parseDeckUrl(raw);
  if (!info) throw new Error("That doesn't look like a valid link.");
  if (!info.site) throw new Error("Deck links work for Archidekt, Moxfield and MTGGoldfish (a specific deck page). For other sites, paste the exported text list.");
  let data;
  try { data = await fetchVia(info.api, info.kind); }
  catch (e) {
    if (e.code === 404) throw new Error(`${info.site} couldn't find that deck — is it public?`);
    throw new Error(`Couldn't reach ${info.site} from the browser. On ${info.site}, use Export → Text and paste the list here instead.`);
  }
  let out;
  if (info.site === "Archidekt") out = archidektToText(data);
  else if (info.site === "Moxfield") out = moxfieldToText(data);
  else out = { text: String(data || ""), name: "" };
  if (/<html|<!doctype/i.test(out.text)) throw new Error(`${info.site} returned a web page instead of a decklist. Paste the exported text list instead.`);
  if (!out.text.trim()) throw new Error(`That ${info.site} deck came back empty — is it public?`);
  return { ...out, site: info.site };
}

// --- Scryfall enrichment parsers: turn authoritative card data into our fields ---
function parseCost(manaCost) {
  const toks = (manaCost || "").match(/\{[^}]+\}/g) || [];
  let c = 0, w = 0;
  toks.forEach((t) => {
    const s = t.replace(/[{}]/g, "");
    if (/^\d+$/.test(s)) c += parseInt(s, 10);
    else if (s === "W") w += 1;
    else if (s === "X") { /* ignore */ }
    else c += 1; // other/hybrid pip — count toward generic so total mana value is right
  });
  return { c, w };
}
function parseFixedStat(oracle) {
  // "gets +X/+Y" but NOT "gets +X/+Y for each ..." (those are scaling auras we model separately)
  const m = (oracle || "").match(/gets \+(\d+)\/\+(\d+)(?! for each)/i);
  return m ? { p: parseInt(m[1], 10), t: parseInt(m[2], 10) } : null;
}


// Parse a non-Aura permanent for effects that matter to a Light-Paws aura deck:
// aura cost reduction (flat or affinity) and card draw when you cast an Aura.
const SUPPORT_V = 2;   // bump when deriveSupport's detection changes
function deriveSupport(c) {
  const o = c.oracle_text || "";
  const lo = o.toLowerCase();
  const type = (c.type_line || "").toLowerCase();
  let flat = 0, affinity = 0, drawPerAura = 0;
  // "Aura spells…", "Aura and Equipment spells…" (Danitha), "Enchantment spells…" you cast cost {N} less
  // — only the clause that names the spells is checked, so "Noncreature spells…" etc. don't count.
  const m = lo.match(/(?:^|[.\n])\s*([^.\n]*?)spells you cast cost \{(\d+)\} less/);
  if (m && /\b(aura|enchantment)/.test(m[1]) && !/\bnon-?(aura|enchantment)/.test(m[1])) flat = parseInt(m[2], 10);
  // "have affinity for Auras" → {1} less per Aura you control
  if (/affinity for auras/.test(lo)) affinity = 1;
  // draw when you cast an aura / enchantment
  if (/whenever you cast an? (aura|enchantment)[^.]*spell[^.]*draw a card/.test(lo)) drawPerAura = 1;
  const cost = parseCost(c.mana_cost);
  return {
    id: "sup_" + norm(c.name), name: c.name, cost, cmc: cost.c + cost.w,
    typeLine: c.type_line || "", flat, affinity, drawPerAura,
    relevant: flat > 0 || affinity > 0 || drawPerAura > 0,
    isLand: /land/.test(type),
  };
}

// Turn a Scryfall card object into a usable aura for the deck, or explain why not.
function deriveAura(c) {
  if (!c || !c.type_line || !/aura/i.test(c.type_line)) return { ok: false, name: c && c.name, reason: "not an Aura" };
  const ci = c.color_identity || [];
  if (ci.some((x) => x !== "W")) return { ok: false, name: c.name, reason: "not white" };
  const o = c.oracle_text || "";
  const lo = o.toLowerCase();
  const enchM = o.match(/enchant ([a-z ]+)/i);
  const enchant = (enchM ? enchM[1] : "creature").toLowerCase();
  const canRide = /(creature|permanent)/.test(enchant) && !/\bland\b|\bplayer\b|opponent/.test(enchant);
  const kwMap = { Flying: "flying", "First strike": "firstStrike", "Double strike": "doubleStrike", Vigilance: "vigilance", Lifelink: "lifelink", Hexproof: "hexproof", Ward: "ward", Indestructible: "indestructible", Protection: "protection" };
  const kw = new Set();
  (c.keywords || []).forEach((k) => { if (kwMap[k]) kw.add(kwMap[k]); });
  if (/protection from/.test(lo)) kw.add("protection");
  if (/umbra armor|totem armor/.test(lo)) kw.add("totemArmor");
  // Spirit Link / Spirit Loop style: "whenever enchanted creature deals damage, you gain that much life" works like lifelink
  if (/enchanted creature deals (combat )?damage[^.]*,? you gain (that much|life equal)/.test(lo) || /enchanted creature has [^.]*lifelink/.test(lo)) kw.add("lifelink");
  const toHand = /put into a graveyard from the battlefield, return (it|this aura|[^.]*?) to (its owner's|your) hand/.test(lo);
  const recur = /\bescape\b/.test(lo) ? "Escape: cast it from your graveyard" : /cast [^.]*from your graveyard/.test(lo) ? "Can be cast from your graveyard" : "";
  const scaleM = o.match(/\+(\d+)\/\+(\d+) for each ([^.\n]+)/i);
  let scale = null, scaleNote = "";
  if (scaleM) {
    const per = { p: parseInt(scaleM[1], 10), t: parseInt(scaleM[2], 10) };
    const what = scaleM[3].toLowerCase();
    const other = /\bother\b/.test(what);
    let base = null;
    if (/artifact/.test(what) && /enchantment/.test(what)) base = "artEnch";
    else if (/enchantment/.test(what)) base = "ench";
    else if (/aura/.test(what)) base = "auras";
    else if (/plains/.test(what)) base = "plains";
    else if (/artifact/.test(what)) base = "art";
    if (base) scale = { base, per, other };
    else scaleNote = "Scaling on " + scaleM[3].trim() + " — not auto-scored";
  }
  const stat = scale ? null : (scaleM ? null : parseFixedStat(o));
  const isRemoval = /can't attack|can't block|loses all abilities|can't be activated|enchant creature an opponent controls/.test(lo);
  // an aura that can attach to your own creature and isn't removal is a buff —
  // even if its benefit comes from counters/triggers (Sunbond, Light of Promise) rather than a static +X/+Y or keyword
  const buff = canRide && !isRemoval;
  const evasion = /protection from creatures|can't be blocked/.test(lo);
  const conditional = /another aura/.test(lo);
  let prot = null;
  if (/protection from creatures/.test(lo)) prot = "creatures";
  else if (/protection/.test(lo) && /(choose a color|the chosen color)/.test(lo)) prot = "choice";
  const draw = /draw a card/.test(lo) ? 1 : 0;
  const token = /(create|put) [^.]*token/.test(lo) ? "now" : null;
  const etbRemoval = /exile target[^.]*(an opponent controls|you don't control)/.test(lo);
  const cost = parseCost(c.mana_cost);
  return {
    ok: true,
    aura: {
      id: "imp_" + norm(c.name), name: c.name, cost, cmc: cost.c + cost.w,
      kw: [...kw], stat, scale, draw, token, etbRemoval,
      conditional, canRide, evasion, buff, prot,
      note: scaleNote,
      flash: /\bflash\b/.test(lo), deck: false, imported: true, toHand, recur,
    },
  };
}
const NAME_INDEX = Object.fromEntries(LIBRARY.map((a) => [norm(a.name), a.id]));

function resolveStat(a, counts) {
  if (a.stat) return { p: a.stat.p, t: a.stat.t };
  const sc = a.scale;
  if (!sc) return { p: 0, t: 0 };
  if (typeof sc === "string") {
    switch (sc) {
      case "ethereal": return { p: counts.ench, t: counts.ench };
      case "atg":      return { p: counts.art + counts.ench, t: counts.art + counts.ench };
      case "sage":     return { p: counts.auras, t: counts.auras };
      case "armored":  return { p: counts.plains, t: counts.plains };
      default:         return { p: 0, t: 0 };
    }
  }
  // generic scale from an imported card: { base, per:{p,t}, other }
  let n = 0;
  switch (sc.base) {
    case "artEnch": n = counts.art + counts.ench; break;
    case "ench":    n = counts.ench; break;
    case "auras":   n = counts.auras; break;
    case "plains":  n = counts.plains; break;
    case "art":     n = counts.art; break;
    default:        n = 0;
  }
  if (sc.other) n = Math.max(0, n - 1);
  return { p: n * (sc.per ? sc.per.p : 0), t: n * (sc.per ? sc.per.t : 0) };
}
const activeKw = (a, otherPresent) => (a.conditional && !otherPresent ? [] : a.kw.filter((k) => k !== "protection"));

const SANS = { fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" };

// persistence — survives reloads / closing the app
const LS = {
  get(k, fb) { try { const v = localStorage.getItem("lp_" + k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v) { try { localStorage.setItem("lp_" + k, JSON.stringify(v)); } catch {} },
};
const DEFAULT_DECK = LIBRARY.filter((a) => a.deck).map((a) => a.id);

/* ---- sample deck: always in the deck list and playable offline. The Auras are built in;
   the other cards' type lines and Board effects fill in from Scryfall the first time it's online. ---- */
const SAMPLE_ID = "sample";
const SAMPLE_V = 1;   // bump to replace everyone's stored copy of the sample
const LIGHT_PAWS = "Light-Paws, Emperor's Voice";
const SAMPLE_SUPPORT = [
  [LIGHT_PAWS], ["Danitha Capashen, Paragon", { flat: 1 }], ["Sram, Senior Edificer", { drawPerAura: 1 }],
  ["Kor Spiritdancer", { drawPerAura: 1 }], ["Mesa Enchantress", { drawPerAura: 1 }], ["Eidolon of Countless Battles"],
  ["Sigil of the Empty Throne"], ["Sphere of Safety"], ["Ghostly Prison"], ["Swords to Plowshares"], ["Path to Exile"],
  ["Sol Ring"], ["Arcane Signet"], ["Mind Stone"], ["Thought Vessel"], ["Fellwar Stone"], ["Generous Gift"],
  ["Enlightened Tutor"], ["Idyllic Tutor"], ["Heliod's Pilgrim"], ["Esper Sentinel"], ["Mother of Runes"],
  ["Giver of Runes"], ["Teferi's Protection"], ["Flawless Maneuver"], ["Wrath of God"], ["Selfless Spirit"],
  ["Land Tax"], ["Weathered Wayfarer"], ["Smothering Tithe"], ["Archaeomancer's Map"],
];
const SAMPLE_LANDS = [["Command Tower"], ["Castle Ardenvale"], ["Emeria, the Sky Ruin"], ["Kor Haven"], ["Myriad Landscape"], ["Rogue's Passage"], ["Plains", 30]];
const costStr = (a) => (a.cost.c ? `{${a.cost.c}}` : "") + "{W}".repeat(a.cost.w);
function makeSampleDeck() {
  const auras = LIBRARY.filter((a) => a.deck);
  const support = SAMPLE_SUPPORT.map(([name, o = {}]) => ({
    id: "sup_" + norm(name), name, cost: { c: 0, w: 0 }, cmc: 0, typeLine: "",
    flat: o.flat || 0, affinity: 0, drawPerAura: o.drawPerAura || 0, relevant: !!(o.flat || o.drawPerAura), isLand: false,
  }));
  const all = [
    ...auras.map((a) => ({ name: a.name, typeLine: "Enchantment — Aura", manaCost: costStr(a), cmc: a.cmc, qty: 1 })),
    ...SAMPLE_SUPPORT.map(([name]) => ({ name, typeLine: "", manaCost: "", cmc: 0, qty: 1 })),
    ...SAMPLE_LANDS.map(([name, q = 1]) => ({ name, typeLine: name === "Plains" ? "Basic Land — Plains" : "", manaCost: "", cmc: 0, qty: q })),
  ];
  return { id: SAMPLE_ID, sample: true, sampleV: SAMPLE_V, name: "Sample deck: Light-Paws Auras", auras, support, all, out: [],
    count: all.reduce((n, c) => n + c.qty, 0), supportV: 0 };
}
function withSample(list) {
  const old = (list || []).find((d) => d.id === SAMPLE_ID);
  return [old && old.sampleV === SAMPLE_V ? old : makeSampleDeck(), ...(list || []).filter((d) => d.id !== SAMPLE_ID)];
}
// cards marked "sideboard" don't count toward the deck and aren't playable
function inDeckCount(d) { const out = new Set(d.out || []); return (d.all || []).reduce((n, c) => n + (out.has(norm(c.name)) ? 0 : (c.qty || 1)), 0); }
const SCRY_COLLECTION = "https://api.scryfall.com/cards/collection";
async function scryCollection(identifiers) {
  try {
    const r = await fetch(SCRY_COLLECTION, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ identifiers }) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
const START_LIFE = 40;
const defaultOpps = (n) => Array.from({ length: n }, (_, i) => ({ id: "o" + (i + 1), name: "Opponent " + (i + 1), life: START_LIFE, cmd: 0 }));
// damage still needed to knock this opponent out: life, or what's left of 21 commander damage
const oppNeed = (o) => Math.max(0, Math.min(o.life, 21 - o.cmd));
const oppOut = (o) => o.life <= 0 || o.cmd >= 21;

/* ======================================================================== */

export default function LightPawsConsole() {
  const [tab, setTab] = useState(0);
  const [tourStep, setTourStep] = useState(-1);          // -1 = tour not showing
  const navRefs = useRef([]);
  useEffect(() => { loadAnalytics(); }, []);
  // first visit: open the tour once (a "?" button replays it)
  useEffect(() => {
    if (LS.get("tourSeen", false)) return;
    const t = setTimeout(() => { setTourStep(0); setTab(TOUR_STEPS[0].tab); }, 500);
    return () => clearTimeout(t);
  }, []);
  const TAB_NAMES = ["active", "cast", "fetch", "board", "deck"];
  const [settingsOpen, setSettingsOpen] = useState(null);   // null = closed, else the section to open ("weights" or true)
  const [viewDeckId, setViewDeckId] = useState(null);       // deck whose full list is open
  const [viewEdit, setViewEdit] = useState(false);          // open that list straight into edit mode
  const openSettings = (section) => { setSettingsOpen(section || true); track("settings/open" + (section ? "/" + section : "")); };
  useEffect(() => { track("tab/" + TAB_NAMES[tab]); }, [tab]);
  const startTour = () => { setTourStep(0); setTab(TOUR_STEPS[0].tab); track("tour/replay"); };
  const endTour = (how) => {
    setTourStep(-1); LS.set("tourSeen", true); track("tour/" + how);
    setTab(4);
    setTimeout(() => { const ta = document.querySelector("textarea"); if (ta && !ta.value) ta.focus(); }, 150);
  };
  const tourGo = (i) => { if (i >= TOUR_STEPS.length) { endTour("done"); return; } setTourStep(i); setTab(TOUR_STEPS[i].tab); };
  const [fetchMv, setFetchMv] = useState(2);          // lifted from Fetch tab so Cast can pre-set it
  const [pendingFetch, setPendingFetch] = useState(null); // {count, mv} → shows the "go to Fetch?" popup
  const [castLoop, setCastLoop] = useState(null);
  const [protPrompt, setProtPrompt] = useState(null); // aura needing a protection color // {remaining:[ids]} while walking a multi-aura best play
  const [decks, setDecks] = useState(() => withSample(LS.get("decks", [])));     // [{id,name,auras,support,all,out}]
  const [activeId, setActiveId] = useState(() => { const id = LS.get("activeId", null); return id && LS.get("decks", []).some((d) => d.id === id) ? id : SAMPLE_ID; });
  const [equipped, setEquipped] = useState(() => new Set(LS.get("equipped", [])));
  const [manualKw, setManualKw] = useState(() => new Set(LS.get("manual", [])));
  const [opps, setOpps] = useState(() => { const o = LS.get("opps", null); return Array.isArray(o) && o.length ? o : defaultOpps(3); });
  const [counters, setCounters] = useState(() => LS.get("counters", 0));     // +1/+1 counters on Light-Paws
  const [grave, setGrave] = useState(() => LS.get("grave", []));            // Aura ids in your graveyard, newest first
  const aliveOpps = opps.filter((o) => !oppOut(o));
  const lethalNeed = aliveOpps.length ? Math.min(...aliveOpps.map(oppNeed)) : 0;
  const [costRed, setCostRed] = useState(() => LS.get("costRed", 0));      // flat "Auras cost {1} less" sources
  const [affinity, setAffinity] = useState(() => LS.get("affinity", 0));   // Pearl-Ear: {1} less per Aura you control
  const [white, setWhite] = useState(() => LS.get("white", 2));
  const [other, setOther] = useState(() => LS.get("other", 0));
  const [baseP, setBaseP] = useState(() => LS.get("baseP", 2));
  const [baseT, setBaseT] = useState(() => LS.get("baseT", 2));
  const [plains, setPlains] = useState(() => LS.get("plains", 0));
  const [artifacts, setArtifacts] = useState(() => LS.get("artifacts", 0));
  const [otherEnch, setOtherEnch] = useState(() => LS.get("otherEnch", 0));
  const [heroImg, setHeroImg] = useState(null);
  const [heroArtist, setHeroArtist] = useState(null);
  const [infoCard, setInfoCard] = useState(null);
  const [pickCard, setPickCard] = useState(null);
  const [chosenPrints, setChosenPrints] = useState(() => LS.get("prints", {}));
  useEffect(() => { LS.set("prints", chosenPrints); }, [chosenPrints]);
  const [protChoice, setProtChoice] = useState(() => LS.get("protchoice", {}));
  useEffect(() => { LS.set("protchoice", protChoice); }, [protChoice]);
  const setProt = (id, color) => setProtChoice((p) => ({ ...p, [id]: color }));
  const openInfo = (aura) => setInfoCard(aura);
  // Long-pressing a card image shouldn't pop the browser's "open / save image" menu.
  useEffect(() => {
    const h = (e) => { if (e.target && e.target.tagName === "IMG") e.preventDefault(); };
    document.addEventListener("contextmenu", h);
    return () => document.removeEventListener("contextmenu", h);
  }, []);
  const choosePrint = (name, pr) => setChosenPrints((p) => ({ ...p, [name]: pr }));

  // save on change
  useEffect(() => { LS.set("decks", decks); }, [decks]);
  useEffect(() => { LS.set("activeId", activeId); }, [activeId]);
  useEffect(() => { LS.set("equipped", [...equipped]); }, [equipped]);
  useEffect(() => { LS.set("manual", [...manualKw]); }, [manualKw]);
  useEffect(() => { LS.set("opps", opps); }, [opps]);
  useEffect(() => { LS.set("counters", counters); }, [counters]);
  useEffect(() => { LS.set("grave", grave); }, [grave]);
  useEffect(() => { LS.set("costRed", costRed); }, [costRed]);
  useEffect(() => { LS.set("affinity", affinity); }, [affinity]);
  useEffect(() => { LS.set("white", white); }, [white]);
  useEffect(() => { LS.set("other", other); }, [other]);
  useEffect(() => { LS.set("baseP", baseP); }, [baseP]);
  useEffect(() => { LS.set("baseT", baseT); }, [baseT]);
  useEffect(() => { LS.set("plains", plains); }, [plains]);
  useEffect(() => { LS.set("artifacts", artifacts); }, [artifacts]);
  useEffect(() => { LS.set("otherEnch", otherEnch); }, [otherEnch]);
  // one-time: clear the old placeholder board-count defaults (artifacts=1, plains=6) that were saved before this fix
  useEffect(() => {
    if (!LS.get("countsReset_v1", false)) { setPlains(0); setArtifacts(0); LS.set("countsReset_v1", true); }
  }, []);

  const [enriched, setEnriched] = useState(() => LS.get("enriched", null));
  const [onBoard, setOnBoard] = useState(() => new Set(LS.get("onBoard", [])));      // support cards currently in play
  useEffect(() => { LS.set("onBoard", [...onBoard]); }, [onBoard]);
  const [importing, setImporting] = useState(false);

  // Background: pull authoritative cost/stat for the whole library from Scryfall.
  // Cached data (if any) is used instantly; this refreshes it. Falls back to
  // hardcoded values when offline.
  useEffect(() => {
    let ok = true;
    (async () => {
      const ids = LIBRARY.map((a) => ({ name: a.name }));
      const chunks = [];
      for (let i = 0; i < ids.length; i += 75) chunks.push(ids.slice(i, i + 75));
      const map = {};
      for (const chunk of chunks) {
        try {
          const r = await fetch("https://api.scryfall.com/cards/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ identifiers: chunk }),
          });
          if (!r.ok) continue;
          const d = await r.json();
          (d.data || []).forEach((c) => {
            map[norm(c.name)] = { cost: parseCost(c.mana_cost), stat: parseFixedStat(c.oracle_text) };
          });
        } catch { /* offline — keep cache / hardcoded */ }
      }
      if (ok && Object.keys(map).length) { setEnriched(map); LS.set("enriched", map); }
    })();
    return () => { ok = false; };
  }, []);

  // effective library: hardcoded scoring semantics + Scryfall-authoritative cost/stat
  const baseLib = useMemo(() => LIBRARY.map((a) => {
    const e = enriched && enriched[norm(a.name)];
    if (!e) return a;
    const cost = e.cost && (e.cost.c + e.cost.w) > 0 ? e.cost : a.cost;
    const out = { ...a, cost, cmc: cost.c + cost.w };
    if (!a.scale && e.stat) out.stat = e.stat; // override fixed stats; keep scale auras
    return out;
  }), [enriched]);
  const builtinByName = useMemo(() => Object.fromEntries(baseLib.map((a) => [norm(a.name), a])), [baseLib]);

  // ---- saved decks ----
  const activeDeck = useMemo(() => decks.find((d) => d.id === activeId) || decks.find((d) => d.id === SAMPLE_ID) || null, [decks, activeId]);
  const hasDeck = !!activeDeck;
  const deckOut = useMemo(() => new Set(activeDeck ? activeDeck.out || [] : []), [activeDeck]);
  // auras of the active deck (minus sideboard), refreshed against the enriched built-in library where names match
  const deckAuras = useMemo(() => {
    if (!activeDeck) return [];
    return (activeDeck.auras || []).filter((a) => !deckOut.has(norm(a.name))).map((a) => builtinByName[norm(a.name)] || a);
  }, [activeDeck, builtinByName, deckOut]);
  const supportPool = useMemo(() => (activeDeck ? (activeDeck.support || []).filter((x) => !deckOut.has(norm(x.name))) : []), [activeDeck, deckOut]);
  const graveSet = useMemo(() => new Set(grave), [grave]);
  // Decks with cards still missing a type line (the sample, or a card added offline): fill them in from Scryfall once.
  const filling = useRef(new Set());
  useEffect(() => {
    const d = decks.find((x) => !filling.current.has(x.id) && (x.all || []).some((c) => !c.typeLine));
    if (!d) return;
    filling.current.add(d.id);
    const missing = d.all.filter((c) => !c.typeLine).map((c) => c.name);
    (async () => {
      const info = {};
      for (let i = 0; i < missing.length; i += 75) {
        const j = await scryCollection(missing.slice(i, i + 75).map((name) => ({ name })));
        if (!j) return;                                  // offline: try again next load
        (j.data || []).forEach((c) => { info[norm(c.name)] = c; info[norm(c.name.split(" // ")[0])] = c; });
      }
      setDecks((prev) => prev.map((x) => (x.id !== d.id ? x : { ...x, all: x.all.map((c) => {
        const s = info[norm(c.name)];
        return s && !c.typeLine ? { ...c, typeLine: s.type_line || "", manaCost: s.mana_cost || (s.card_faces && s.card_faces[0] ? s.card_faces[0].mana_cost : "") || "", cmc: s.cmc || 0 } : c;
      }) })));
    })();
  }, [decks]);
  // Decks saved before a detection fix: quietly re-derive their non-Aura cards from Scryfall once.
  useEffect(() => {
    if (!activeDeck || activeDeck.supportV === SUPPORT_V) return;
    const sup = activeDeck.support || [];
    const deckId = activeDeck.id;
    if (!sup.length) { setDecks((prev) => prev.map((d) => (d.id === deckId ? { ...d, supportV: SUPPORT_V } : d))); return; }
    let ok = true;
    (async () => {
      const fresh = {};
      for (let i = 0; i < sup.length; i += 75) {
        const chunk = sup.slice(i, i + 75);
        try {
          const r = await fetch("https://api.scryfall.com/cards/collection", {
            method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ identifiers: chunk.map((x) => ({ name: x.name })) }),
          });
          if (!r.ok) return;                         // try again next load
          const d = await r.json();
          (d.data || []).forEach((c) => { const x = deriveSupport(c); fresh[x.id] = x; });
        } catch { return; }                          // offline — try again next load
      }
      if (!ok) return;
      setDecks((prev) => prev.map((d) => (d.id !== deckId ? d
        : { ...d, supportV: SUPPORT_V, support: (d.support || []).map((x) => (fresh[x.id] ? { ...x, ...fresh[x.id] } : x)) })));
    })();
    return () => { ok = false; };
  }, [activeDeck && activeDeck.id, activeDeck && activeDeck.supportV]);
  // name lookup that knows about imported cards (ids like "imp_…"), falling back to the built-in library
  const nameOf = (id) => { const c = deckAuras.find((x) => x.id === id) || supportPool.find((x) => x.id === id); return c ? c.name : byName(id); };

  // Sort one Scryfall card into the deck's playable Auras or its other (Board) cards.
  function classifyCard(c, auras, support) {
    const builtin = builtinByName[norm(c.name)];
    if (builtin) { auras.push(builtin); return; }           // keep hand-tuned scoring where we have it
    const res = deriveAura(c);
    if (res.ok) { auras.push(res.aura); return; }
    const sup = deriveSupport(c);
    if (!sup.isLand) support.push(sup);
  }
  const allEntry = (c, qty) => ({ name: c.name, typeLine: c.type_line || "", manaCost: c.mana_cost || (c.card_faces && c.card_faces[0] ? c.card_faces[0].mana_cost : "") || "", cmc: c.cmc || 0, qty });
  const printOf = (c) => ({ set: c.set, collector: c.collector_number, setName: c.set_name, img: getImg(c), artist: c.artist, tcgplayer_id: c.tcgplayer_id });

  // Parse a pasted decklist into a full deck object: auras (playable), support (board), all (viewing).
  // "1 Sol Ring (C21) 263" keeps that exact printing (Moxfield/Archidekt exports and links include it).
  async function buildDeckFromList(text) {
    const names = [];
    const qtyByKey = {}, printByKey = {};
    text.split("\n").forEach((raw) => {
      let line = raw.trim();
      const qm = line.match(/^(\d+)\s*x?\s+/i);
      const qty = qm ? Math.max(1, parseInt(qm[1], 10)) : 1;
      if (!line) return;
      if (/^\/\//.test(line)) return;                                             // "// Commander" style comments
      if (/^(deck|main|mainboard|commanders?|companions?|sideboard|maybeboard|considering|about|tokens?)\s*:?\s*(\(\d+\))?$/i.test(line)) return;  // section headers only
      if (/^name\s/i.test(line)) return;                                        // Arena "About / Name X" block
      line = line.replace(/^\d+\s*x?\s+/i, "")
        .replace(/\s+#.*$/, "")                       // Moxfield #tags
        .replace(/\s*\^[^^]*\^/g, "")                 // Archidekt ^color tags^
        .replace(/\s*\[[^\]]*\]/g, "")                // Archidekt [Categories]
        .replace(/(\s+\*[^*]*\*)+\s*$/, "")          // *F* / *E* foil markers
        .trim();
      let pr = null;
      const pm = line.match(/\s*\(([A-Za-z0-9]{2,6})\)\s*([^\s()]+)?\s*$/);   // (SET) 123 printing
      if (pm) { pr = { set: pm[1].toLowerCase(), cn: pm[2] || null }; line = line.slice(0, pm.index); }
      line = line.replace(/\s*\([^)]*\)\s*[\w-]*\s*$/, "").trim();         // any other trailing (…) tag
      if (line) {
        const k = norm(line);
        names.push(line); qtyByKey[k] = Math.max(qtyByKey[k] || 0, qty);   // same card on two lines (e.g. commander listed in Commanders + mainboard) counts once
        if (pr && !printByKey[k]) printByKey[k] = pr;
      }
    });
    // look up a Scryfall card's quantity (handles "Front // Back" names requested by front face)
    const qtyOf = (c) => qtyByKey[norm(c.name)] || qtyByKey[norm((c.name || "").split(" // ")[0])] || 1;
    const uniq = [...new Map(names.map((n) => [norm(n), n])).values()];
    const auras = [], support = [], all = [], rejected = [], prints = {};
    const prOf = (name) => printByKey[norm(name)] || printByKey[norm((name || "").split(" // ")[0])];
    const idFor = (n) => { const pr = printByKey[norm(n)]; if (!pr) return { name: n }; return pr.cn ? { set: pr.set, collector_number: pr.cn } : { name: n, set: pr.set }; };
    const seen = new Set();
    const take = (c) => {
      if (seen.has(norm(c.name))) return; seen.add(norm(c.name));
      all.push(allEntry(c, qtyOf(c)));
      classifyCard(c, auras, support);
      const pr = prOf(c.name);
      if (pr && c.set === pr.set) prints[c.name] = printOf(c);
    };
    for (let i = 0; i < uniq.length; i += 75) {
      const chunk = uniq.slice(i, i + 75);
      const d = await scryCollection(chunk.map(idFor));
      if (!d) { rejected.push(...chunk); continue; }
      (d.data || []).forEach(take);
      // a printing Scryfall doesn't recognize falls back to the plain card name
      const retry = [];
      (d.not_found || []).forEach((nf) => {
        if (nf.name && !nf.set) { rejected.push(nf.name + " (not found)"); return; }
        const n = nf.name || chunk.find((x) => { const pr = printByKey[norm(x)]; return pr && pr.set === String(nf.set || "").toLowerCase() && pr.cn === nf.collector_number; });
        if (n) retry.push(n); else rejected.push("unknown (not found)");
      });
      if (retry.length) {
        const d2 = await scryCollection(retry.map((name) => ({ name })));
        if (!d2) { rejected.push(...retry); continue; }
        (d2.data || []).forEach(take);
        (d2.not_found || []).forEach((nf) => rejected.push((nf.name || "unknown") + " (not found)"));
      }
    }
    return { auras, support, all, rejected, prints };
  }

  async function importList(text, name, replaceId) {
    setImporting(true);
    try {
      const built = await buildDeckFromList(text);
      if (!built.all.length) {
        return { error: built.rejected.length
          ? `No cards recognized — nothing was saved. Couldn't read: ${built.rejected.slice(0, 3).join(", ")}${built.rejected.length > 3 ? "…" : ""}`
          : "No cards found — nothing was saved." };
      }
      const deckObj = {
        id: replaceId || ("deck_" + Date.now()),
        name: name || "Untitled deck",
        auras: built.auras, support: built.support, all: built.all, out: [],
        count: built.all.reduce((n, c) => n + (c.qty || 1), 0),
        supportV: SUPPORT_V,
      };
      setDecks((prev) => {
        const without = prev.filter((d) => d.id !== deckObj.id);
        return [...without, deckObj];
      });
      const nPrints = Object.keys(built.prints).length;
      if (nPrints) setChosenPrints((p) => ({ ...p, ...built.prints }));    // use the printings picked on Moxfield/Archidekt
      setActiveId(deckObj.id);
      clearGame();
      return { auras: built.auras.length, support: built.support.length, total: deckObj.count, unique: built.all.length, rejected: built.rejected, prints: nPrints };
    } finally { setImporting(false); }
  }

  function clearGame() { setEquipped(new Set()); setHand(new Set()); setOnBoard(new Set()); setGrave([]); setCounters(0); }
  const deleteDeck = (id) => {
    if (id === SAMPLE_ID) return;                                    // the sample always stays
    setDecks((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) { setActiveId(SAMPLE_ID); clearGame(); }
  };
  const renameDeck = (id, name) => setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  const selectDeck = (id) => { setActiveId(id); clearGame(); };

  // ---- edit a deck on the fly (game state is kept) ----
  const recount = (d) => ({ ...d, count: (d.all || []).reduce((n, c) => n + (c.qty || 1), 0) });
  const updateDeck = (id, fn) => setDecks((prev) => prev.map((d) => (d.id === id ? recount(fn(d)) : d)));
  const setCardQty = (deckId, name, qty) => updateDeck(deckId, (d) => {
    if (qty > 0) return { ...d, all: d.all.map((c) => (c.name === name ? { ...c, qty } : c)) };
    const k = norm(name);
    return { ...d, all: d.all.filter((c) => c.name !== name), auras: (d.auras || []).filter((a) => norm(a.name) !== k),
      support: (d.support || []).filter((x) => norm(x.name) !== k), out: (d.out || []).filter((x) => x !== k) };
  });
  const toggleOut = (deckId, name) => updateDeck(deckId, (d) => {
    const out = new Set(d.out || []); const k = norm(name);
    out.has(k) ? out.delete(k) : out.add(k);
    return { ...d, out: [...out] };
  });
  async function addCardByName(deckId, name) {
    let c;
    try {
      const r = await fetch("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(name), { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error();
      c = await r.json();
    } catch { throw new Error("Couldn't load that card from Scryfall. Check your connection."); }
    updateDeck(deckId, (d) => {
      const ex = (d.all || []).find((x) => norm(x.name) === norm(c.name));
      if (ex) return { ...d, all: d.all.map((x) => (x === ex ? { ...x, qty: (x.qty || 1) + 1 } : x)) };
      const auras = [...(d.auras || [])], support = [...(d.support || [])];
      classifyCard(c, auras, support);
      return { ...d, all: [...(d.all || []), allEntry(c, 1)], auras, support };
    });
    track("deck/add-card");
    return c.name;
  }
  // The sample stays as shipped: editing it makes your own copy (and keeps the current game going)
  const copyDeck = (id) => {
    const src = decks.find((d) => d.id === id); if (!src) return null;
    const nd = { ...src, id: "deck_" + Date.now(), name: src.sample ? "My Light-Paws deck" : src.name + " (copy)", sample: false, sampleV: undefined };
    setDecks((prev) => [...prev, nd]);
    if (activeId === id) setActiveId(nd.id);
    return nd.id;
  };

  const deckNames = useMemo(() => new Set(deckAuras.map((a) => a.name)), [deckAuras]);
  const [hand, setHand] = useState(() => new Set(LS.get("hand", [])));
  useEffect(() => { LS.set("hand", [...hand]); }, [hand]);
  const [weights, setWeights] = useState(() => ({ ...DEFAULT_WEIGHTS, ...LS.get("weights", {}) }));
  useEffect(() => { LS.set("weights", weights); }, [weights]);
  const W = weights;
  const handAuras = useMemo(() => deckAuras.filter((a) => hand.has(a.id)), [deckAuras, hand]);
  const handSupport = useMemo(() => supportPool.filter((x) => hand.has(x.id)), [supportPool, hand]);
  const deckAuraIds = useMemo(() => new Set(deckAuras.map((a) => a.id)), [deckAuras]);
  const equippedIds = useMemo(() => [...equipped].filter((id) => deckAuraIds.has(id)), [equipped, deckAuraIds]);

  // Light-Paws art from Scryfall (falls back to an emblem)
  useEffect(() => {
    let ok = true;
    fetch("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent("Light-Paws, Emperor's Voice"), { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => { if (ok && d && d.image_uris) { setHeroImg(d.image_uris.art_crop); setHeroArtist(d.artist || null); } })
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  // ---- live context from equipped auras + manual toggles ----
  const ctx = useMemo(() => {
    const have = new Set(manualKw);
    const on = deckAuras.filter((a) => equipped.has(a.id));
    on.forEach((a) => {
      const others = on.length >= 2;
      activeKw(a, others).forEach((k) => have.add(k));
      if (a.kw.includes("protection")) have.add("protection");
    });
    const counts = { auras: on.length, ench: on.length + otherEnch, art: artifacts, plains };
    let addP = 0, addT = 0;
    on.forEach((a) => { const s = resolveStat(a, counts); addP += s.p; addT += s.t; });
    const evasive = have.has("flying") || on.some((a) => a.evasion);
    return { have, on, counts, addP, addT, evasive };
  }, [equipped, manualKw, deckAuras, plains, artifacts, otherEnch]);

  const bP = baseP + counters, bT = baseT + counters;     // printed stats plus +1/+1 counters
  const curPower = bP + ctx.addP;
  const curTough = bT + ctx.addT;
  const curDS = ctx.have.has("doubleStrike");
  const projDmg = Math.round(curPower * (curDS ? 2 : 1) * (ctx.evasive ? 1 : W.CONNECT_GROUND));

  // ---- value of adding a set of auras ----
  function valueOfAdding(ids) {
    const set = deckAuras.filter((a) => ids.includes(a.id));
    const resulting = ctx.on.length + set.length;
    const counts = { auras: resulting, ench: resulting + otherEnch, art: artifacts, plains };
    const before = ctx.have;

    let addP = 0, addT = 0;
    {
      const beforeCounts = { auras: ctx.on.length, ench: ctx.on.length + otherEnch, art: artifacts, plains };
      let beforeP = 0, beforeT = 0;
      ctx.on.forEach((a) => { const s = resolveStat(a, beforeCounts); beforeP += s.p; beforeT += s.t; });
      let afterP = 0, afterT = 0;
      [...ctx.on, ...set].forEach((a) => { const s = resolveStat(a, counts); afterP += s.p; afterT += s.t; });
      addP = afterP - beforeP; addT = afterT - beforeT;
    }
    const statScore = addP * W.P_VAL + addT * W.T_VAL;

    const otherPresent = resulting >= 2 || ctx.on.length >= 1;
    const added = new Set();
    set.forEach((a) => activeKw(a, otherPresent).forEach((k) => added.add(k)));
    const finalHave = new Set(before); added.forEach((k) => finalHave.add(k));

    const evasive = finalHave.has("flying") || [...ctx.on, ...set].some((a) => a.evasion);
    const connect = evasive ? W.CONNECT_EVASIVE : W.CONNECT_GROUND;
    const projPower = bP + ctx.addP + addP;

    let kwScore = 0; const gainedKw = [];
    KW_ORDER.forEach((k) => {
      if (k === "protection") return;
      if (!(finalHave.has(k) && !hasKw(before, k))) return;
      if (k === "firstStrike" && finalHave.has("doubleStrike")) return;
      if (k === "totemArmor" && finalHave.has("indestructible")) return;
      if (k === "doubleStrike") { const v = projPower * connect; kwScore += v; gainedKw.push(`Double strike (~${v.toFixed(1)})`); return; }
      kwScore += W[k]; gainedKw.push(KW[k].label);
    });
    const prot = set.filter((a) => a.kw.includes("protection")).length;
    if (prot > 0) { kwScore += prot * W.protection; gainedKw.push(prot > 1 ? `Protection ×${prot}` : "Protection"); }

    let effScore = 0, draws = 0;
    set.forEach((a) => {
      if (a.draw === "sage") draws += counts.auras; else if (a.draw) draws += a.draw;
      if (a.token === "now") effScore += W.TOKEN_NOW;
      if (a.token === "cond") effScore += W.TOKEN_COND;
      if (a.etbRemoval) effScore += W.ETB_REMOVAL;
    });
    draws += set.length * drawPerAuraCast;   // Pearl-Ear / Sram etc: draw on each Aura cast
    effScore += draws * W.DRAW_VAL;

    // LETHAL: if this play's swing reaches the threshold, it wins — that dominates everything.
    // Damage = final power, doubled for double strike. Evasion doesn't reduce it here; the
    // threshold is what YOU need to connect for, and the player decides if it gets through.
    const finalDS = finalHave.has("doubleStrike");
    const swing = projPower * (finalDS ? 2 : 1);
    const wasLethal = (bP + ctx.addP) * (hasKw(before, "doubleStrike") ? 2 : 1) >= lethalNeed;
    const lethalScore = (!wasLethal && lethalNeed > 0 && swing >= lethalNeed) ? W.LETHAL_BONUS : 0;
    if (lethalScore) gainedKw.push(`LETHAL (${swing})`);

    return { score: kwScore + statScore + effScore + lethalScore, gainedKw, addP, addT, draws, swing, lethal: lethalScore > 0,
      manaW: set.reduce((s, a) => s + a.cost.w, 0), manaTotal: set.reduce((s, a) => s + effTotal(a), 0) };
  }

  // Cost reduction (Pearl-Ear affinity + flat reducers). Reduces GENERIC mana only —
  // colored pips are never reduced, and printed mana value is unchanged (Fetch still uses a.cmc).
  const boardCards = useMemo(() => supportPool.filter((x) => onBoard.has(x.id)), [supportPool, onBoard]);
  const boardFlat = boardCards.reduce((n, x) => n + (x.flat || 0), 0);
  const boardAffinity = boardCards.reduce((n, x) => n + (x.affinity || 0), 0);
  const drawPerAuraCast = boardCards.reduce((n, x) => n + (x.drawPerAura || 0), 0);
  const costReduction = costRed + boardFlat + (affinity + boardAffinity) * equippedIds.length;
  const effGeneric = (a) => Math.max(0, a.cost.c - costReduction);
  const effTotal = (a) => effGeneric(a) + a.cost.w;
  const auraInfo = useMemo(() => {
    const m = {};
    handAuras.forEach((a) => {
      const onBoard = equipped.has(a.id);
      const affordable = white >= a.cost.w && (white + other) >= effTotal(a);
      let marginal = 0, redundant = false;
      if (a.buff && !onBoard) { marginal = valueOfAdding([a.id]).score; redundant = marginal < 0.5; }
      m[a.id] = { onBoard, affordable, marginal, redundant };
    });
    return m;
  }, [handAuras, equipped, white, other, plains, artifacts, otherEnch, manualKw, baseP, baseT, counters, weights, lethalNeed, costRed, affinity, onBoard, supportPool]);

  // value of the auras a combo would let you TUTOR (each cast triggers Light-Paws' search).
  // A cast aura of mana value m can fetch a deck aura of cost ≤ m, different name, not already
  // controlled or in hand. Bigger casts pick first; each fetch claims a distinct target.
  function fetchValueFor(comboIds) {
    if (!comboIds.length) return 0;
    const comboSet = new Set(comboIds);
    const pool = deckAuras
      .filter((a) => a.buff && a.canRide && !equipped.has(a.id) && !hand.has(a.id) && !graveSet.has(a.id) && !comboSet.has(a.id))
      .map((a) => ({ a, v: valueOfAdding([a.id]).score }))
      .sort((x, y) => y.v - x.v);
    const casts = comboIds.map((id) => deckAuras.find((a) => a.id === id)).filter(Boolean).sort((a, b) => b.cmc - a.cmc);
    const claimed = new Set();
    let total = 0;
    for (const c of casts) {
      for (const p of pool) {
        if (claimed.has(p.a.id)) continue;
        if (p.a.cmc <= c.cmc && p.v > 0) { total += p.v; claimed.add(p.a.id); break; }
      }
    }
    return total;
  }

  const best = useMemo(() => {
    const total = white + other;
    const evalCombo = (ids) => { const base = valueOfAdding(ids); const fetch = fetchValueFor(ids); return { ...base, fetchValue: fetch, totalScore: base.score + fetch }; };
    const cands = handAuras.filter((a) => a.buff && !equipped.has(a.id) && a.canRide)
      .map((a) => ({ a, s: evalCombo([a.id]).totalScore })).sort((x, y) => y.s - x.s);
    // mana not tracked (0): recommend the single best aura (own value + its best fetch)
    if (total === 0) {
      const top = cands.filter((c) => c.s > 0.5)[0];
      return { ids: top ? [top.a.id] : [], eval: top ? evalCombo([top.a.id]) : evalCombo([]), single: top ? top.a : null, noMana: true };
    }
    let bestSet = [], bestScore = 0, bestEval = evalCombo([]); let nodes = 0;
    (function dfs(i, chosen, wU, tU) {
      if (nodes++ > 300000) return;
      const ev = evalCombo(chosen);
      if (ev.totalScore > bestScore + 1e-9) { bestScore = ev.totalScore; bestSet = [...chosen]; bestEval = ev; }
      for (let j = i; j < cands.length; j++) {
        const a = cands[j].a, nw = wU + a.cost.w, nt = tU + effTotal(a);
        if (nw <= white && nt <= total) dfs(j + 1, [...chosen, a.id], nw, nt);
      }
    })(0, [], 0, 0);
    const single = cands.filter(({ a }) => white >= a.cost.w && total >= effTotal(a))[0];
    return { ids: bestSet, eval: bestEval, single: single ? single.a : null };
  }, [handAuras, equipped, hand, graveSet, white, other, plains, artifacts, otherEnch, manualKw, baseP, baseT, counters, weights, lethalNeed, costRed, affinity, onBoard, supportPool, deckAuras]);

  // ---- actions ----
  const removeFromHand = (id) => setHand((s) => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n; });
  // if a newly attached aura needs a protection color chosen, prompt immediately
  const maybePromptProt = (ids) => {
    const needs = ids.map((id) => deckAuras.find((x) => x.id === id)).find((a) => a && a.prot === "choice" && !protChoice[a.id]);
    if (needs) setProtPrompt(needs);
  };
  // ---- undo toast: every board-changing action shows what happened, with an Undo ----
  const [toast, setToast] = useState(null);     // { msg, detail, snap, key }
  const snapshot = () => ({ equipped: [...equipped], hand: [...hand], onBoard: [...onBoard], grave: [...grave], counters, opps, manualKw: [...manualKw], castLoop });
  const notify = (msg, detail, snap) => setToast({ msg, detail: detail || null, snap: snap || null, key: Date.now() + Math.random() });
  const undo = () => {
    const s = toast && toast.snap; if (!s) return;
    setEquipped(new Set(s.equipped)); setHand(new Set(s.hand)); setOnBoard(new Set(s.onBoard)); setGrave(s.grave);
    setCounters(s.counters); setOpps(s.opps); setManualKw(new Set(s.manualKw)); setCastLoop(s.castLoop); setPendingFetch(null);
    setToast({ msg: "Undone.", key: Date.now() }); track("undo");
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.snap ? 6500 : 1800);
    return () => clearTimeout(t);
  }, [toast && toast.key]);
  const auraById = (id) => deckAuras.find((x) => x.id === id) || byId[id];

  // attach (or take off) an Aura on Light-Paws; how = "fetch" when it came from Light-Paws' trigger
  const equip = (id, how) => {
    const snap = snapshot();
    const attaching = !equipped.has(id);
    setEquipped((s) => { const n = new Set(s); attaching ? n.add(id) : n.delete(id); return n; });
    removeFromHand(id); // equipping anywhere (incl. manual on Active) pulls it out of your hand
    setGrave((g) => (g.includes(id) ? g.filter((x) => x !== id) : g));
    if (attaching) maybePromptProt([id]);
    if (how === "fetch") notify(`Fetched ${nameOf(id)} and attached it to Light-Paws.`, "Light-Paws' trigger searched your library for it.", snap);
    else notify(attaching ? `Attached ${nameOf(id)} to Light-Paws.` : `Took ${nameOf(id)} off Light-Paws.`, null, snap);
  };
  // an attached Aura leaves the battlefield: to the graveyard (or back to hand for Spirit Loop-style Auras)
  const sendToGrave = (id) => {
    const snap = snapshot(); const a = auraById(id);
    setEquipped((s) => { const n = new Set(s); n.delete(id); return n; });
    if (a && a.toHand) { setHand((s) => new Set(s).add(id)); notify(`${nameOf(id)} went back to your hand.`, "It returns to hand instead of staying in the graveyard.", snap); }
    else { setGrave((g) => [id, ...g.filter((x) => x !== id)]); notify(`${nameOf(id)} went to the graveyard.`, a && a.recur ? a.recur + "." : null, snap); }
  };
  const fromGrave = (id, where) => {
    const snap = snapshot();
    setGrave((g) => g.filter((x) => x !== id));
    if (where === "attach") { setEquipped((s) => new Set(s).add(id)); maybePromptProt([id]); }
    if (where === "hand") setHand((s) => new Set(s).add(id));
    notify(where === "attach" ? `Returned ${nameOf(id)} from your graveyard to Light-Paws.` : where === "hand" ? `Returned ${nameOf(id)} to your hand.` : `Exiled ${nameOf(id)} from your graveyard.`, null, snap);
  };
  // Light-Paws dies or is exiled. savedBy = an umbra (totem armor) Aura destroyed instead.
  const lightPawsDies = (savedBy) => {
    const snap = snapshot();
    if (savedBy) {
      const a = auraById(savedBy);
      setEquipped((s) => { const n = new Set(s); n.delete(savedBy); return n; });
      if (a && a.toHand) setHand((s) => new Set(s).add(savedBy)); else setGrave((g) => [savedBy, ...g.filter((x) => x !== savedBy)]);
      notify(`Umbra armor saved Light-Paws.`, `${nameOf(savedBy)} was destroyed instead and all damage was removed.`, snap);
      track("died/umbra"); return;
    }
    const ids = [...equippedIds];
    const back = ids.filter((id) => (auraById(id) || {}).toHand);
    const gy = ids.filter((id) => !back.includes(id));
    setEquipped(new Set()); setCounters(0); setManualKw(new Set());
    setGrave((g) => [...gy, ...g.filter((x) => !gy.includes(x))]);
    if (back.length) setHand((s) => { const n = new Set(s); back.forEach((id) => n.add(id)); return n; });
    notify("Light-Paws left the battlefield.", `${gy.length} Aura${gy.length === 1 ? "" : "s"} went to the graveyard${back.length ? `, ${back.map(nameOf).join(", ")} went back to hand` : ""}. Counters were removed.`, snap);
    track("died/all");
  };
  // combat damage split between opponents: alloc = { oppId: amount }
  const applyDamage = (alloc, asCmd) => {
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    if (!total) return;
    const snap = snapshot();
    setOpps((os) => os.map((o) => { const n = alloc[o.id] || 0; return n ? { ...o, life: o.life - n, cmd: asCmd ? o.cmd + n : o.cmd } : o; }));
    const hit = opps.filter((o) => alloc[o.id]);
    const ko = hit.filter((o) => o.life - alloc[o.id] <= 0 || (asCmd && o.cmd + alloc[o.id] >= 21)).map((o) => o.name);
    notify(`Dealt ${hit.map((o) => `${alloc[o.id]} to ${o.name}`).join(", ")}.`,
      [ctx.have.has("lifelink") ? `Lifelink: you gain ${total} life.` : null, ko.length ? `${ko.join(" and ")} ${ko.length > 1 ? "are" : "is"} out!` : null].filter(Boolean).join(" "), snap);
    track("damage/" + hit.length);
  };
  const addToHand = (id) => setHand((s) => new Set(s).add(id));
  const clearHand = () => setHand(new Set());
  // cast one or more auras from hand: attach them, remove from hand, then offer the fetch
  const castMany = (ids) => {
    const snap = snapshot();
    setEquipped((s) => { const n = new Set(s); ids.forEach((id) => n.add(id)); return n; });
    setHand((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
    const mv = Math.max(1, ...ids.map((id) => { const a = deckAuras.find((x) => x.id === id); return a ? a.cmc : 1; }));
    maybePromptProt(ids);
    setPendingFetch({ count: ids.length, mv: Math.min(mv, 5) });
    notify(`Cast ${ids.map(nameOf).join(", ")}: attached to Light-Paws.`,
      `Light-Paws triggers${ids.length > 1 ? " for each one" : ""}: search your library for an Aura with mana value ${ids.length > 1 ? "up to that Aura's" : mv} or less.`, snap);
  };
  const castFromHand = (id) => castMany([id]);
  const castSupport = (id) => {
    const snap = snapshot();
    setOnBoard((s) => new Set(s).add(id));
    setHand((s) => { const n = new Set(s); n.delete(id); return n; });
    notify(`Cast ${nameOf(id)}: it's on your Board now.`, "Not an Aura, so Light-Paws doesn't trigger.", snap);
  };
  // ---- Cast & Fetch loop (for multi-aura best plays): cast one → fetch → back → next ----
  const startCastLoop = (ids) => setCastLoop({ remaining: [...ids] });
  const exitCastLoop = () => setCastLoop(null);
  const castLoopPick = (id) => {
    const a = deckAuras.find((x) => x.id === id);
    notify(`Cast ${nameOf(id)}: attached to Light-Paws.`, `Now fetch an Aura with mana value ${a ? a.cmc : "?"} or less.`, snapshot());
    setEquipped((s) => new Set(s).add(id));
    setHand((s) => { const n = new Set(s); n.delete(id); return n; });
    setCastLoop((prev) => ({ remaining: (prev ? prev.remaining : []).filter((x) => x !== id) }));
    maybePromptProt([id]);
    setFetchMv(a ? Math.min(a.cmc, 5) : 2);
    setTab(2);
  };
  const backToCast = () => { setTab(1); setCastLoop((prev) => (prev && prev.remaining.length === 0 ? null : prev)); };
  const toggleManual = (k) => setManualKw((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const resetTurn = () => {
    setEquipped(new Set()); setManualKw(new Set()); setProtChoice({}); setHand(new Set()); setArtifacts(0); setOtherEnch(0); setPlains(0); setWhite(2); setOther(0); setOnBoard(new Set());
    setGrave([]); setCounters(0); setOpps((os) => os.map((o) => ({ ...o, life: START_LIFE, cmd: 0 }))); setToast(null);
  };

  // ---- swipe between tabs ----
  const touch = useRef({ x: 0, y: 0 });
  const onTS = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTE = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      setTab((t) => Math.min(4, Math.max(0, t + (dx < 0 ? 1 : -1))));
    }
  };

  // Light-Paws art follows the printing you picked for it (the art crop of that printing)
  const lpPrint = chosenPrints[LIGHT_PAWS];
  const heroShown = lpPrint && lpPrint.img ? lpPrint.img.replace(/\/(normal|large|png)\//, "/art_crop/") : heroImg;
  const heroBy = lpPrint && lpPrint.img ? lpPrint.artist || heroArtist : heroArtist;

  const TABS = [
    { icon: Star, label: "Active" },
    { icon: Sparkles, label: "Cast" },
    { icon: Wand2, label: "Fetch" },
    { icon: Gem, label: "Board" },
    { icon: Layers, label: "Deck" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ ...SANS, background: "radial-gradient(1200px 600px at 50% -10%, #26314d 0%, #161a26 55%, #0f1118 100%)", color: "#ece7db" }}>
      <div className="max-w-lg mx-auto pb-24" onTouchStart={onTS} onTouchEnd={onTE}>
        <AppHeader onSettings={() => openSettings()} />

        {activeDeck && activeDeck.sample && tab < 4 && (
          <div className="mx-3 mt-2 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-[12px] flex-1 leading-snug" style={{ color: "#b7b1a2" }}>Playing the <b style={{ color: "#ece7db" }}>sample deck</b>. Import yours to play your own list.</span>
            <button onClick={() => setTab(4)} className="text-[12px] font-bold rounded-lg px-3 py-1.5 flex-shrink-0" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Import</button>
          </div>
        )}
        {hasDeck && tab === 0 && (
          <BoardTab {...{ heroImg: heroShown, heroArtist: heroBy, ctx, manualKw, toggleManual, curPower, curTough, projDmg, curDS, deckAuras, equipped, equip, equippedIds, resetTurn, white, setWhite, other, setOther, openInfo, protChoice, setProt, plains, setPlains, artifacts, setArtifacts, otherEnch, setOtherEnch,
            counters, setCounters, onPortraitHold: () => setPickCard({ name: LIGHT_PAWS }), grave, graveSet, fromGrave, sendToGrave, lightPawsDies, opps, setOpps, applyDamage, auraById }} />
        )}
        {hasDeck && tab === 1 && (
          <PlayTab {...{ onOpenWeights: () => openSettings("weights"), white, setWhite, other, setOther, baseP, setBaseP, baseT, setBaseT, counters, curPower, curTough, projDmg, curDS, ctx, best, deckAuras, handAuras, hand, auraInfo, castFromHand, castMany, addToHand, removeFromHand, clearHand, equipped, graveSet, byName: nameOf, openInfo, weights, setWeights, castLoop, startCastLoop, castLoopPick, exitCastLoop, resetTurn, equippedIds, costRed, setCostRed, affinity, setAffinity, costReduction, handSupport, supportPool, castSupport, onBoard }} />
        )}
        {hasDeck && tab === 2 && (
          <FetchTab {...{ onOpenWeights: () => openSettings("weights"), deckAuras, equipped, hand, graveSet, equip: (id) => equip(id, "fetch"), valueOfAdding, curPower, curTough, openInfo, weights, setWeights, mv: fetchMv, setMv: setFetchMv, loopActive: !!castLoop, onBackToCast: backToCast, onAfterFetch: () => setTab(1), ctx, equippedIds, curDS, resetTurn }} />
        )}
        {hasDeck && tab === 3 && (
          <BoardStateTab {...{ supportPool, onBoard, setOnBoard, boardCards, costReduction, drawPerAuraCast, equippedIds,
            white, setWhite, other, setOther, plains, setPlains, artifacts, setArtifacts, otherEnch, setOtherEnch, resetTurn }} />
        )}
        {tab === 4 && (
          <DeckTab {...{ decks, activeId: activeDeck ? activeDeck.id : null, onImport: importList, importing, selectDeck, deleteDeck, renameDeck, synced: !!enriched, onViewList: (id, edit) => { setViewDeckId(id); setViewEdit(!!edit); track("deck/view-list"); } }} />
        )}

        <TabFooter />
      </div>

      {/* bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-amber-900/40 backdrop-blur safe-bottom" style={{ background: "rgba(15,17,24,0.9)" }}>
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {TABS.map((t, i) => {
            const Ico = t.icon; const active = tab === i;
            return (
              <button key={i} ref={(el) => { navRefs.current[i] = el; }} onClick={() => setTab(i)} className="flex flex-col items-center gap-0.5 py-2.5 transition"
                style={{ color: active ? "#e8b84b" : "#8b8778" }}>
                <Ico size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
                {active && <span className="w-6 h-0.5 rounded-full mt-0.5" style={{ background: "#e8b84b" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {tourStep >= 0 && (
        <TourOverlay step={tourStep} total={TOUR_STEPS.length} data={TOUR_STEPS[tourStep]}
          target={navRefs.current[TOUR_STEPS[tourStep].tab]}
          onNext={() => tourGo(tourStep + 1)} onBack={() => tourGo(Math.max(0, tourStep - 1))} onSkip={() => endTour("skip")} />
      )}

      {viewDeckId && decks.some((d) => d.id === viewDeckId) && (
        <DeckListSheet deck={decks.find((d) => d.id === viewDeckId)} playing={activeDeck && viewDeckId === activeDeck.id}
          onPlay={() => { selectDeck(viewDeckId); setViewDeckId(null); }}
          onClose={() => setViewDeckId(null)} onPick={setPickCard} chosenPrints={chosenPrints} openInfoCard={openInfo}
          startEdit={viewEdit} setCardQty={setCardQty} toggleOut={toggleOut} addCardByName={addCardByName}
          onCopy={() => { const nid = copyDeck(viewDeckId); if (nid) setViewDeckId(nid); return nid; }} />
      )}
      {settingsOpen && (
        <SettingsSheet initialSection={settingsOpen === true ? null : settingsOpen} onClose={() => setSettingsOpen(null)}
          weights={weights} setWeights={setWeights}
          onTour={() => { setSettingsOpen(null); startTour(); }} />
      )}
      {infoCard && <CardInfoModal aura={infoCard} chosenPrint={chosenPrints[infoCard.name]} onClose={() => setInfoCard(null)}
        onChoose={(pr) => { choosePrint(infoCard.name, pr); track("printing/choose-popup"); }} />}
      {protPrompt && (
        <div onClick={() => setProtPrompt(null)} className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#1a1e2b", border: "1px solid rgba(147,199,230,0.5)" }}>
            <div className="font-bold text-lg mb-1" style={{ color: "#f0ead9" }}>{protPrompt.name}</div>
            <p className="text-sm mb-4" style={{ color: "#b7b1a2" }}>Choose the color you named for protection. You can change it later on the Active tab.</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              {COLORS.map((c) => (
                <button key={c.key} onClick={() => { setProt(protPrompt.id, c.key); setProtPrompt(null); }} title={c.label}
                  className="rounded-full flex items-center justify-center" style={{ width: 44, height: 44, background: c.hex, border: "2px solid rgba(0,0,0,0.35)" }}>
                  <span className="text-base font-black" style={{ color: c.fg }}>{c.label[0]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setProtPrompt(null)} className="w-full text-sm font-bold rounded-lg py-2" style={{ background: "rgba(255,255,255,0.08)", color: "#cfc9ba" }}>Choose later</button>
          </div>
        </div>
      )}
      {pendingFetch && (
        <div onClick={() => setPendingFetch(null)} className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#1a1e2b", border: "1px solid rgba(232,184,75,0.4)" }}>
            <div className="font-bold text-lg mb-1" style={{ color: "#f0ead9" }}>Cast {pendingFetch.count > 1 ? `${pendingFetch.count} auras` : "aura"}</div>
            <p className="text-sm mb-4" style={{ color: "#b7b1a2" }}>
              {pendingFetch.count > 1 ? "Search your library for the first aura to attach to Light-Paws?" : "Search your library for an aura to attach to Light-Paws?"}
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setFetchMv(pendingFetch.mv); setTab(2); setPendingFetch(null); }} className="flex-1 text-sm font-bold rounded-lg py-2.5" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Go to Fetch</button>
              <button onClick={() => setPendingFetch(null)} className="flex-1 text-sm font-bold rounded-lg py-2.5" style={{ background: "rgba(255,255,255,0.08)", color: "#cfc9ba" }}>Stay here</button>
            </div>
          </div>
        </div>
      )}
      {pickCard && <CardViewer card={pickCard} chosen={chosenPrints[pickCard.name]} onChoose={(pr) => { choosePrint(pickCard.name, pr); track("printing/choose"); }} onClose={() => setPickCard(null)} />}
      {toast && <UndoToast toast={toast} onUndo={undo} onClose={() => setToast(null)} />}
    </div>
  );
}

function byName(id) { return byId[id] ? byId[id].name : id; }

/* ====================== TAB 1 · ACTIVE ====================== */
const BTN_GOLD = { background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" };
const BTN_2 = { background: "rgba(255,255,255,0.07)", color: "#cfc9ba", border: "1px solid rgba(255,255,255,0.16)" };
const cmcBucket = (a) => Math.max(1, Math.min(5, a.cmc));

function BoardTab({ heroImg, heroArtist, ctx, manualKw, toggleManual, curPower, curTough, projDmg, curDS, deckAuras, equipped, equip, equippedIds, resetTurn, white, setWhite, other, setOther, openInfo, protChoice, setProt, plains, setPlains, artifacts, setArtifacts, otherEnch, setOtherEnch,
  counters, setCounters, onPortraitHold, grave, graveSet, fromGrave, sendToGrave, lightPawsDies, opps, setOpps, applyDamage, auraById }) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(() => new Set());
  const [cmc, setCmc] = useState(() => new Set());
  const [dying, setDying] = useState(false);
  const toggleFilter = (k) => setFilters((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleCmc = (b) => setCmc((s) => { const n = new Set(s); n.has(b) ? n.delete(b) : n.add(b); return n; });

  const pool = useMemo(() => deckAuras.filter((a) => !equipped.has(a.id) && !graveSet.has(a.id)), [deckAuras, equipped, graveSet]);
  const availableKw = KW_ORDER.filter((k) => pool.some((a) => a.kw.includes(k)));
  const results = pool.filter((a) => auraMatchesText(a, q)
      && (!filters.size || [...filters].every((f) => a.kw.includes(f)))
      && (!cmc.size || cmc.has(cmcBucket(a))))
    .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));

  const swing = curPower * (curDS ? 2 : 1);
  const ring = useTapHold(() => setCounters((c) => c + 1), onPortraitHold);
  const umbras = equippedIds.map(auraById).filter((a) => a && a.kw.includes("totemArmor"));
  const died = () => { if (umbras.length) setDying(true); else lightPawsDies(); };
  const R = 41; // keyword ring radius (% of the stage)
  return (
    <div>
      {/* TOP: portrait + counter ring + keyword ring */}
      <div className="relative px-3 pt-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: HDR }}>Active · Light-Paws</div>
            <div className="text-sm" style={{ color: "#9a9484" }}>What's attached to your commander right now</div>
          </div>
          <button onClick={resetTurn} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg" style={BTN_2}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <div className="relative mx-auto" style={{ height: 330, maxWidth: 380 }}>
          {/* halo */}
          <div className="absolute left-1/2 top-1/2 pointer-events-none" style={{ width: 200, height: 200, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,184,75,0.35), rgba(232,184,75,0) 70%)" }} />
          {/* counter ring around the portrait: tap = +1/+1 counter, hold = Light-Paws' printings */}
          <div {...ring} role="button" aria-label="Add a +1/+1 counter to Light-Paws. Press and hold to change its printing." className="absolute left-1/2 top-1/2 flex items-center justify-center"
            style={{ width: 164, height: 164, transform: "translate(-50%,-50%)", borderRadius: "50%", border: "2.5px dashed rgba(232,184,75,0.8)", cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
            <div className="overflow-hidden shadow-xl" style={{ width: 132, height: 132, borderRadius: "50%", border: "3px solid #e8b84b", background: "#0d0f16" }}>
              {heroImg ? <img src={heroImg} alt="Light-Paws" className="w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} /> : <FoxEmblem />}
            </div>
          </div>
          {/* counter badge (sits in the gap at the bottom of the keyword ring) */}
          <div className="absolute left-1/2 flex items-center gap-1 rounded-full px-1 py-0.5" style={{ top: "calc(50% + 68px)", transform: "translateX(-50%)", background: "#1a1e2b", border: "1px solid rgba(232,184,75,0.6)", zIndex: 2 }}>
            {counters > 0 ? (
              <>
                <button onClick={() => setCounters((c) => Math.max(0, c - 1))} aria-label="Remove a +1/+1 counter" className="w-6 h-6 rounded-full flex items-center justify-center" style={BTN_2}><Minus size={12} /></button>
                <span className="text-[12px] font-black px-0.5 whitespace-nowrap" style={{ color: "#f0ead9" }}>+{counters}/+{counters}</span>
                <button onClick={() => setCounters((c) => c + 1)} aria-label="Add a +1/+1 counter" className="w-6 h-6 rounded-full flex items-center justify-center" style={BTN_GOLD}><Plus size={12} /></button>
              </>
            ) : (
              <button onClick={() => setCounters(1)} className="text-[11px] font-bold px-2 py-0.5 whitespace-nowrap" style={{ color: "#e8b84b" }}>+ counter</button>
            )}
          </div>
          {/* keyword ring (tap to toggle by hand) */}
          {KW_ORDER.map((k, i) => {
            const ang = (-90 + i * (360 / KW_ORDER.length)) * Math.PI / 180;
            const left = 50 + R * Math.cos(ang), top = 50 + R * Math.sin(ang);
            const on = hasKw(ctx.have, k);
            const Ico = KW[k].Icon;
            return (
              <button key={k} onClick={() => toggleManual(k)} aria-pressed={on}
                className="absolute flex flex-col items-center justify-center transition-all"
                style={{
                  left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-50%)",
                  width: 58, height: 58, borderRadius: "50%",
                  border: on ? "2px solid #e8b84b" : "1.5px solid rgba(255,255,255,0.22)",
                  background: on ? "linear-gradient(160deg,#e8b84b,#b9852a)" : "rgba(255,255,255,0.05)",
                  color: on ? "#221a09" : "#8b8778",
                  boxShadow: on ? "0 0 16px rgba(232,184,75,0.6)" : "none",
                }}>
                <Ico size={19} strokeWidth={on ? 2.4 : 1.7} />
                <span className="text-[8px] font-bold leading-tight mt-0.5 text-center px-0.5">{KW[k].label}</span>
              </button>
            );
          })}
        </div>
        <div className="text-center text-[10.5px] -mt-1 mb-1" style={{ color: "#7d7869" }}>Tap the dashed ring: +1/+1 counter · hold it: Light-Paws' printings · tap a keyword to toggle it</div>

        {/* P/T */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black" style={{ color: "#f4ecd8", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{curPower}</span>
            <span className="text-2xl font-bold" style={{ color: HDR }}>/</span>
            <span className="text-5xl font-black" style={{ color: "#f4ecd8", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{curTough}</span>
            {curDS && <span className="text-lg font-black ml-1" style={{ color: "#f0ead9" }}>×2 = {curPower * 2}</span>}
          </div>
          <div className="text-[12px] mt-1" style={{ color: "#9a9484" }}>
            {equippedIds.length} Aura{equippedIds.length === 1 ? "" : "s"} attached{counters > 0 ? ` · ${counters} counter${counters === 1 ? "" : "s"}` : ""}
          </div>
        </div>

        {/* protection */}
        <div className="px-3 mt-3">
          <ProtectionTracker protAuras={ctx.on.filter((a) => a.prot)} protChoice={protChoice} setProt={setProt} />
        </div>

        {heroArtist && <div className="text-center text-[10px] mt-1" style={{ color: "#5f5a4e" }}>Art by {heroArtist} · © Wizards of the Coast</div>}
      </div>

      <div className="h-px mx-3 my-3" style={{ background: "linear-gradient(90deg,transparent,rgba(232,184,75,0.5),transparent)" }} />

      <div className="px-3">
        {/* attached auras */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: HDR }}>Enchants/Auras ({equippedIds.length})</span>
          {(ctx.addP > 0 || ctx.addT > 0) && <span className="text-xs font-bold" style={{ color: "#cfc9ba" }}>+{ctx.addP}/+{ctx.addT} from auras</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-1 min-h-[28px]">
          {equippedIds.length === 0 && <span className="text-sm italic" style={{ color: "#6f6a5d" }}>No Auras attached yet. Search below to add what you cast.</span>}
          {equippedIds.map((id) => {
            const a = auraById(id);
            return (
              <span key={id} className="inline-flex items-center rounded-full text-sm font-semibold" style={BTN_GOLD}>
                <button onClick={() => a && openInfo(a)} className="pl-2.5 pr-1 py-1">{a ? a.name : byName(id)}</button>
                <button onClick={() => sendToGrave(id)} aria-label={`Send ${a ? a.name : id} to the graveyard`} className="pr-1.5 pl-0.5 py-1"><X size={14} /></button>
              </span>
            );
          })}
        </div>
        {equippedIds.length > 0 && <div className="text-[10.5px] mb-3" style={{ color: "#7d7869" }}>Tap a name for the card (swipe to change printing) · × sends it to the graveyard</div>}

        <OpponentsPanel opps={opps} setOpps={setOpps} swing={swing} applyDamage={applyDamage} />

        {/* graveyard */}
        <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: HDR }}><Skull size={13} /> Graveyard ({grave.length})</span>
            {(equippedIds.length > 0 || counters > 0) && (
              <button onClick={died} className="text-[11px] font-bold rounded-lg px-2.5 py-1.5" style={{ ...BTN_2, color: "#e6939a" }}>Light-Paws died</button>
            )}
          </div>
          {grave.length === 0 ? (
            <p className="text-[11px]" style={{ color: "#6f6a5d" }}>Auras that leave Light-Paws land here, so you can see what you can bring back.</p>
          ) : (
            <div className="grid gap-1.5">
              {grave.map((id) => {
                const a = auraById(id);
                if (!a) return null;
                return (
                  <div key={id} className="rounded-lg px-2.5 py-2" style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] flex items-center gap-1.5" style={{ color: "#e6dfce" }}>{a.name} <ManaCost aura={a} /></div>
                        {a.recur && <div className="text-[10.5px]" style={{ color: "#93c7e6" }}>{a.recur}</div>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {a.canRide && <button onClick={() => fromGrave(id, "attach")} className="text-[11px] font-bold rounded-lg px-2.5 py-1.5" style={BTN_GOLD}>Attach</button>}
                        <button onClick={() => fromGrave(id, "hand")} className="text-[11px] font-bold rounded-lg px-2 py-1.5" style={BTN_2}>Hand</button>
                        <button onClick={() => fromGrave(id, "exile")} aria-label={`Exile ${a.name}`} className="rounded-lg px-1.5 py-1.5" style={BTN_2}><X size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* add auras to Light-Paws */}
        <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: HDR }}>Add an Aura you cast</div>
        <AuraFilterBar mvLabel="Mana value" mvSelected={cmc} onMv={toggleCmc} q={q} setQ={setQ}
          kwAvail={availableKw} kwSel={filters} toggleKw={toggleFilter} onClear={() => { setFilters(new Set()); setCmc(new Set()); setQ(""); }}
          hint="Tap a card to pick it, then Add · hold for the full card" />

        <div className="grid gap-1.5">
          {results.map((a) => (
            <EquipRow key={a.id} aura={a} ctx={ctx} onEquip={() => equip(a.id)} onInfo={() => openInfo(a)} />
          ))}
          {results.length === 0 && <div className="text-sm italic py-3 text-center" style={{ color: "#6f6a5d" }}>No matching auras in your deck.</div>}
        </div>
      </div>

      {dying && (
        <div onClick={() => setDying(false)} className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#1a1e2b", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div className="font-bold text-lg mb-1" style={{ color: "#f0ead9" }}>Light-Paws would die</div>
            <p className="text-sm mb-3" style={{ color: "#b7b1a2" }}>If it was destroyed, an umbra (totem armor) Aura can be destroyed instead and all damage is removed.</p>
            <div className="grid gap-1.5 mb-2">
              {umbras.map((a) => (
                <button key={a.id} onClick={() => { setDying(false); lightPawsDies(a.id); }} className="w-full text-sm font-bold rounded-lg py-2.5 inline-flex items-center justify-center gap-1.5" style={BTN_GOLD}>
                  <ArmorIcon size={15} /> Destroy {a.name} instead
                </button>
              ))}
            </div>
            <button onClick={() => { setDying(false); lightPawsDies(); }} className="w-full text-sm font-bold rounded-lg py-2.5 mb-2" style={{ ...BTN_2, color: "#e6939a" }}>It left anyway (exiled, sacrificed…)</button>
            <button onClick={() => setDying(false)} className="w-full text-sm font-semibold rounded-lg py-2" style={{ color: "#8b8778" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// One shared filter block so Active and Fetch look and behave the same:
// mana value buttons, then search, then keyword chips (a card must have every keyword you pick).
function AuraFilterBar({ mvLabel, mvSelected, onMv, q, setQ, kwAvail, kwSel, toggleKw, onClear, hint }) {
  const chip = (on) => (on ? { ...BTN_GOLD, border: "1px solid #e8b84b" } : { background: "rgba(255,255,255,0.05)", color: "#cfc9ba", border: "1px solid rgba(255,255,255,0.2)" });
  const any = q || kwSel.size;
  return (
    <div className="rounded-xl p-2.5 mb-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: HDR }}>{mvLabel}</div>
      <NoSwipe className="flex items-center gap-1.5 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onMv(n)} aria-pressed={mvSelected.has(n)} className="flex-1 rounded-lg font-bold text-base py-2" style={chip(mvSelected.has(n))}>{n === 5 ? "5+" : n}</button>
        ))}
      </NoSwipe>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <Search size={16} style={{ color: "#8b8778" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: name, keyword, or note"
          className="bg-transparent outline-none text-sm w-full" style={{ color: "#ece7db" }} />
        {q && <button onClick={() => setQ("")} aria-label="Clear search"><X size={15} style={{ color: "#8b8778" }} /></button>}
      </div>
      {kwAvail.length > 0 && (
        <NoSwipe className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <Filter size={13} style={{ color: "#8b8778", flexShrink: 0 }} />
          {kwAvail.map((k) => (
            <button key={k} onClick={() => toggleKw(k)} aria-pressed={kwSel.has(k)} className="text-[11px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap flex-shrink-0" style={chip(kwSel.has(k))}>{KW[k].label}</button>
          ))}
          {any ? <button onClick={onClear} className="text-[11px] px-2 py-1 rounded-full flex-shrink-0" style={{ color: "#8b8778" }}>clear</button> : null}
        </NoSwipe>
      )}
      {hint && <div className="text-[10.5px] mt-1.5" style={{ color: "#7d7869" }}>{hint}</div>}
    </div>
  );
}

// Each opponent's life and Light-Paws commander damage; "Deal damage" splits a hit between them.
function OpponentsPanel({ opps, setOpps, swing, applyDamage }) {
  const [split, setSplit] = useState(null);
  const upd = (id, f) => setOpps((os) => os.map((o) => (o.id === id ? f(o) : o)));
  // pick how many opponents are at the table; existing names/life are kept, extras added at full life
  const setCount = (n) => setOpps((os) => (n <= os.length ? os.slice(0, n)
    : [...os, ...Array.from({ length: n - os.length }, (_, i) => ({ id: "o" + Date.now() + i, name: "Opponent " + (os.length + i + 1), life: START_LIFE, cmd: 0 }))]));
  const alive = opps.filter((o) => !oppOut(o));
  const openSplit = () => {
    const target = alive.slice().sort((a, b) => oppNeed(a) - oppNeed(b))[0];
    setSplit({ [target.id]: swing });
  };
  return (
    <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: HDR }}><Users size={13} /> Opponents</span>
        <span className="text-[11px]" style={{ color: "#8b8778" }}>Light-Paws swings for <b style={{ color: "#f0ead9" }}>{swing}</b></span>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] mr-1" style={{ color: "#8b8778" }}>How many?</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setCount(n)} aria-pressed={opps.length === n} aria-label={`${n} opponent${n === 1 ? "" : "s"}`}
            className="flex-1 rounded-lg font-bold text-sm py-1.5"
            style={opps.length === n ? { ...BTN_GOLD, border: "1px solid #e8b84b" } : { background: "rgba(255,255,255,0.05)", color: "#cfc9ba", border: "1px solid rgba(255,255,255,0.2)" }}>{n}</button>
        ))}
      </div>
      <div className="grid gap-1.5">
        {opps.map((o) => {
          const out = oppOut(o), need = oppNeed(o), lethal = !out && need > 0 && swing >= need;
          return (
            <div key={o.id} className="rounded-lg px-2.5 py-2" style={{ background: lethal ? "rgba(143,211,154,0.10)" : "rgba(0,0,0,0.22)", border: lethal ? "1px solid rgba(143,211,154,0.6)" : "1px solid rgba(255,255,255,0.07)", opacity: out ? 0.55 : 1 }}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => { const n = prompt("Opponent name", o.name); if (n && n.trim()) upd(o.id, (x) => ({ ...x, name: n.trim().slice(0, 24) })); }}
                  className="text-[13px] font-bold inline-flex items-center gap-1 min-w-0" style={{ color: "#ece7db" }}>
                  <span className="truncate">{o.name}</span> <Pencil size={11} style={{ color: "#8b8778", flexShrink: 0 }} />
                </button>
                <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: out ? "#e6939a" : lethal ? "#8fd39a" : "#8b8778" }}>
                  {out ? "Out" : lethal ? `Lethal now (needs ${need})` : `Needs ${need}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] uppercase" style={{ color: "#8b8778" }}>Life</span>
                  <MiniStep value={o.life} set={(f) => upd(o.id, (x) => ({ ...x, life: f(x.life) }))} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] uppercase" style={{ color: "#8b8778" }}>Cmdr</span>
                  <MiniStep value={o.cmd} set={(f) => upd(o.id, (x) => ({ ...x, cmd: f(x.cmd) }))} />
                  <span className="text-[10px]" style={{ color: "#6f6a5d" }}>/21</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={openSplit} disabled={!swing || !alive.length} className="w-full mt-2 text-sm font-bold rounded-lg py-2 inline-flex items-center justify-center gap-1.5"
        style={!swing || !alive.length ? { ...BTN_2, opacity: 0.5 } : BTN_GOLD}><Target size={15} /> Deal damage</button>
      {split && <DamageSplit opps={alive} swing={swing} init={split} onClose={() => setSplit(null)} onApply={(alloc, cmd) => { applyDamage(alloc, cmd); setSplit(null); }} />}
    </div>
  );
}

function DamageSplit({ opps, swing, init, onApply, onClose }) {
  const [total, setTotal] = useState(swing);
  const [alloc, setAlloc] = useState(init);
  const [cmd, setCmd] = useState(true);
  const used = Object.values(alloc).reduce((a, b) => a + b, 0);
  const left = total - used;
  const setFor = (id, v) => setAlloc((s) => ({ ...s, [id]: Math.max(0, v) }));
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-4" style={{ background: "#1a1e2b", border: "1px solid rgba(255,255,255,0.15)", maxHeight: "88vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-bold text-lg" style={{ color: "#f0ead9" }}>Deal damage</div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded" style={BTN_2}><X size={16} /></button>
        </div>
        <p className="text-[12px] mb-3 leading-snug" style={{ color: "#9a9484" }}>Split the damage between opponents however it was dealt (extra combats, double strike, different attacks). Tap a name to send everything left there.</p>
        <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-2" style={{ background: "rgba(0,0,0,0.25)" }}>
          <span className="text-[12px]" style={{ color: "#cfc9ba" }}>Total damage</span>
          <MiniStep value={total} set={setTotal} />
        </div>
        <div className="grid gap-1.5 mb-2">
          {opps.map((o) => {
            const v = alloc[o.id] || 0, need = oppNeed(o);
            return (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: v >= need && v > 0 ? "1px solid rgba(143,211,154,0.6)" : "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={() => setFor(o.id, v + Math.max(0, left))} className="text-left min-w-0">
                  <div className="text-[13px] font-bold truncate" style={{ color: "#ece7db" }}>{o.name}</div>
                  <div className="text-[10.5px]" style={{ color: v >= need && v > 0 ? "#8fd39a" : "#8b8778" }}>{o.life} life · {o.cmd}/21 cmdr{v >= need && v > 0 ? " · lethal" : ` · needs ${need}`}</div>
                </button>
                <span className="inline-flex items-center gap-1">
                  <button onClick={() => setFor(o.id, v - 1)} className="w-7 h-7 rounded flex items-center justify-center" style={BTN_2}><Minus size={13} /></button>
                  <span className="text-base font-bold w-7 text-center" style={{ color: "#f0ead9" }}>{v}</span>
                  <button onClick={() => left > 0 && setFor(o.id, v + 1)} disabled={left <= 0} className="w-7 h-7 rounded flex items-center justify-center" style={{ ...BTN_2, opacity: left <= 0 ? 0.4 : 1 }}><Plus size={13} /></button>
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] mb-2 text-center" style={{ color: left < 0 ? "#e6939a" : "#8b8778" }}>{left === 0 ? "All damage assigned" : left > 0 ? `${left} left to assign` : `${-left} more than the total`}</div>
        <label className="flex items-center gap-2 text-[12px] mb-3 cursor-pointer" style={{ color: "#cfc9ba" }}>
          <input type="checkbox" checked={cmd} onChange={(e) => setCmd(e.target.checked)} /> Counts as commander damage (Light-Paws combat damage)
        </label>
        <button onClick={() => onApply(alloc, cmd)} disabled={!used} className="w-full text-sm font-bold rounded-lg py-2.5" style={used ? BTN_GOLD : { ...BTN_2, opacity: 0.5 }}>
          Deal {used} damage
        </button>
      </div>
    </div>
  );
}

// "What just happened" bar with Undo, shown after casting, fetching, attaching, sending to the graveyard or dealing damage
function UndoToast({ toast, onUndo, onClose }) {
  return (
    <div className="fixed inset-x-0 z-[60] px-3 pointer-events-none" style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
      <div key={toast.key} role="status" className="max-w-lg mx-auto rounded-xl px-3 py-2.5 flex items-start gap-2 pointer-events-auto toast-in"
        style={{ background: "#232838", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
        <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#8fd39a" }} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-snug" style={{ color: "#f0ead9" }}>{toast.msg}</div>
          {toast.detail && <div className="text-[11.5px] leading-snug mt-0.5" style={{ color: "#a8a293" }}>{toast.detail}</div>}
        </div>
        {toast.snap && (
          <button onClick={onUndo} className="text-[12px] font-bold rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1 flex-shrink-0" style={BTN_GOLD}><Undo2 size={13} /> Undo</button>
        )}
        <button onClick={onClose} aria-label="Dismiss" className="p-1 flex-shrink-0"><X size={14} style={{ color: "#8b8778" }} /></button>
      </div>
    </div>
  );
}

/* ====================== TAB 2 · CAST (play from hand) ====================== */
function PlayTab(p) {
  const { white, setWhite, other, setOther, baseP, setBaseP, baseT, setBaseT, counters, curPower, curTough, projDmg, curDS, ctx, best, deckAuras, handAuras, hand, auraInfo, castFromHand, castMany, addToHand, removeFromHand, clearHand, equipped, graveSet, byName, openInfo, weights, setWeights, castLoop, startCastLoop, castLoopPick, exitCastLoop, resetTurn, equippedIds, costRed, setCostRed, affinity, setAffinity, costReduction, handSupport, supportPool, castSupport, onBoard } = p;
  const [q, setQ] = useState("");
  const [browse, setBrowse] = useState(false);
  const searchRef = useRef(null);
  const total = white + other;
  const listOpen = !!q || browse;
  const boxRef = useRef(null);
  useOutsideClose(boxRef, listOpen, () => { setBrowse(false); setQ(""); if (searchRef.current) searchRef.current.blur(); });

  const addable = deckAuras
    .filter((a) => !hand.has(a.id) && !equipped.has(a.id) && !graveSet.has(a.id) && auraMatchesText(a, q))
    .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
  const addableSupport = (supportPool || [])
    .filter((x) => !hand.has(x.id) && !onBoard.has(x.id) && (!q || norm(x.name).includes(norm(q)) || norm(x.typeLine || "").includes(norm(q))))
    .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));

  return (
    <div className="px-3 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: HDR }}>Cast · from hand</div>
          <p className="text-xs mb-2" style={{ color: "#8b8778" }}>Add the auras you're actually holding, then get the best play for your mana. Casting one triggers Light-Paws — grab the free aura on the Fetch tab.</p>
        </div>
        <button onClick={resetTurn} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0" style={BTN_2}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <BoardPeek {...{ curPower, curTough, curDS, ctx, equippedIds, deckAuras, byName }} />

      {/* mana */}
      <Card>
        <Lbl>Mana available</Lbl>
        <div className="flex gap-2">
          <Step label="White" value={white} set={setWhite} gold />
          <Step label="Other" value={other} set={setOther} />
          <div className="flex-1 flex flex-col items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] uppercase" style={{ color: "#8b8778" }}>Total</div>
            <div className="text-2xl font-bold" style={{ color: "#f0ead9" }}>{total}</div>
          </div>
        </div>
      </Card>

      {/* creature snapshot */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <Lbl inline>Light-Paws</Lbl>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: "#8b8778" }}>base</span>
            <MiniStep value={baseP} set={setBaseP} /><span style={{ color: "#8b8778" }}>/</span><MiniStep value={baseT} set={setBaseT} />
          </div>
        </div>
        <div className="rounded-lg px-3 py-2 flex items-baseline justify-between" style={{ background: "rgba(0,0,0,0.3)" }}>
          <span className="text-[11px] uppercase" style={{ color: "#8b8778" }}>now</span>
          <span className="text-xl font-bold" style={{ color: "#f0ead9" }}>{curPower}/{curTough}</span>
        </div>
        {counters > 0 && <div className="text-[10.5px] mt-1" style={{ color: "#8b8778" }}>Includes {counters} +1/+1 counter{counters === 1 ? "" : "s"} (change them on the Active tab).</div>}
      </Card>

      {/* your hand */}
      <div className="flex items-center justify-between mb-2 mt-1">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: HDR }}>Your hand ({hand.size})</span>
        {hand.size > 0 && <button onClick={clearHand} className="text-[11px] px-2 py-1 rounded" style={BTN_2}>Clear hand</button>}
      </div>

      {/* PROMINENT add-to-hand search — always visible */}
      <div ref={boxRef} className="rounded-xl p-3 mb-3" style={{ background: "rgba(232,184,75,0.09)", border: "1.5px solid rgba(232,184,75,0.55)" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Plus size={14} style={{ color: "#e8b84b" }} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>Add the auras you're holding</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(232,184,75,0.45)" }}>
          <Search size={18} style={{ color: "#e8b84b" }} />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setBrowse(true)} onClick={() => setBrowse(true)} placeholder="Type or tap to browse…" className="bg-transparent outline-none text-base w-full" style={{ color: "#ece7db" }} />
          {q && <button onMouseDown={(e) => e.preventDefault()} onClick={() => setQ("")}><X size={16} style={{ color: "#8b8778" }} /></button>}
          <BrowseToggle open={listOpen} onToggle={() => { if (listOpen) { setBrowse(false); setQ(""); if (searchRef.current) searchRef.current.blur(); } else setBrowse(true); }} />
        </div>
        {listOpen ? (
          <div className="grid gap-1.5 mt-2" style={!q ? { maxHeight: 340, overflowY: "auto", WebkitOverflowScrolling: "touch" } : undefined}>
            {!q && <div className="text-[10px] uppercase tracking-wide" style={{ color: "#8b8778" }}>Auras in your deck ({addable.length})</div>}
            {addable.slice(0, 80).map((a) => (
              <button key={a.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { addToHand(a.id); setQ(""); if (searchRef.current) searchRef.current.focus(); }} className="flex items-center justify-between rounded-lg px-3 py-2 text-left" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="font-semibold text-[14px] flex items-center gap-1.5" style={{ color: "#e6dfce" }}>{a.name} <ManaCost aura={a} />{!a.buff && <span className="text-[10px]" style={{ color: "#8b8778" }}>· removal</span>}</span>
                <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 28, height: 28, background: "rgba(232,184,75,0.2)" }}><Plus size={16} style={{ color: "#e8b84b" }} /></span>
              </button>
            ))}
            {addableSupport.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wide mt-1" style={{ color: "#8b8778" }}>Other permanents</div>
                {addableSupport.slice(0, q ? 20 : 80).map((x) => (
                  <button key={x.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { addToHand(x.id); setQ(""); if (searchRef.current) searchRef.current.focus(); }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span className="min-w-0">
                      <span className="font-semibold text-[14px] block" style={{ color: "#e6dfce" }}>{x.name}</span>
                      <span className="text-[10px]" style={{ color: x.relevant ? "#93c7e6" : "#8b8778" }}>{x.relevant ? "affects your Auras" : x.typeLine}</span>
                    </span>
                    <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 28, height: 28, background: "rgba(232,184,75,0.2)" }}><Plus size={16} style={{ color: "#e8b84b" }} /></span>
                  </button>
                ))}
              </>
            )}
            {addable.length === 0 && addableSupport.length === 0 && <div className="text-sm italic py-2 text-center" style={{ color: "#6f6a5d" }}>{q ? "No match — check spelling." : "Everything in your deck is already in hand or on the battlefield."}</div>}
          </div>
        ) : (
          <div className="text-[11px] mt-1.5" style={{ color: "#8b8778" }}>Tap the box to browse every card you could add, or type a name, keyword, or mana value to narrow it. Add all you can; tap outside to close.</div>
        )}
      </div>

      {handAuras.length === 0 && handSupport.length === 0 ? (
        <div className="rounded-xl p-4 text-center text-sm mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "#8b8778" }}>
          Your hand is empty — use the gold box above to add the cards you're holding.
        </div>
      ) : (
        <>
          {castLoop && castLoop.remaining.length > 0 ? (
            <div className="rounded-xl p-3 mb-3" style={{ background: "linear-gradient(160deg, rgba(232,184,75,0.18), rgba(232,184,75,0.05))", border: "1.5px solid #e8b84b" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>Cast &amp; fetch — which aura next?</span>
                <button onClick={exitCastLoop} title="Exit loop"><X size={16} style={{ color: "#cfc9ba" }} /></button>
              </div>
              <p className="text-[11px] mb-2" style={{ color: "#b7b1a2" }}>Pick one to cast — it'll take you to Fetch to grab a tutor, then bring you back for the next. ({castLoop.remaining.length} left)</p>
              <div className="grid gap-1.5">
                {castLoop.remaining.map((id) => {
                  const a = handAuras.find((x) => x.id === id) || byId[id];
                  return (
                    <button key={id} onClick={() => castLoopPick(id)} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "#f0ead9", color: "#221a09" }}>
                      <span className="font-bold text-[15px] flex items-center gap-1.5">{a ? a.name : byName(id)} <ManaCost aura={a} dark /></span>
                      <span className="text-xs font-bold">Cast &amp; fetch →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
          <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Star size={15} style={{ color: "#e8b84b" }} fill="#e8b84b" />
              <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "#f0ead9" }}>{best.noMana ? "Best aura to play" : `Best play for ${total} mana`}</span>
            </div>
            {best.ids.length === 0 ? (
              <p className="text-sm" style={{ color: "#b7b1a2" }}>{best.noMana ? "No aura in hand adds new value to your board right now." : <>No aura in hand adds new value at this mana.{best.single && <> Cheapest useful cast: <b>{byName(best.single.id)}</b>.</>}</>}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {best.ids.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 text-[15px] font-bold mr-2" style={{ color: "#f0ead9" }}>
                      {byName(id)} <ManaCost aura={handAuras.find((a) => a.id === id) || deckAuras.find((a) => a.id === id) || byId[id]} />
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: "#cfc9ba" }}>
                  {!best.noMana && <span>Uses <b>{best.eval.manaTotal}</b> of {total} mana{total - best.eval.manaTotal > 0 && <> · <b>{total - best.eval.manaTotal}</b> open</>}</span>}
                  <span>Score <b>{(best.eval.totalScore != null ? best.eval.totalScore : best.eval.score).toFixed(1)}</b></span>
                  {best.eval.fetchValue > 0 && <span style={{ color: "#93c7e6" }}>+{best.eval.fetchValue.toFixed(1)} from tutors</span>}
                  {best.eval.gainedKw.length > 0 && <span>Gains: {best.eval.gainedKw.join(", ")}</span>}
                </div>
                {best.ids.length > 1 ? (
                  <button onClick={() => startCastLoop(best.ids)} className="w-full text-sm font-bold rounded-lg py-2" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
                    Cast &amp; Fetch Multiple ({best.ids.length}) →
                  </button>
                ) : (
                  <button onClick={() => castMany(best.ids)} className="w-full text-sm font-bold rounded-lg py-2" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
                    Cast {byName(best.ids[0])}
                  </button>
                )}
                {best.noMana && <div className="text-[11px] mt-1.5" style={{ color: "#8b8778" }}>Set your mana above for a multi-aura best play.</div>}
              </>
            )}
          </div>
          )}

          {handAuras.length > 0 && <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: HDR }}>Auras</div>}
          <div className="grid gap-1.5 mb-3">
            {handAuras.map((a) => (
              <HandRow key={a.id} aura={a} info={auraInfo[a.id]} ctx={ctx} rec={best.ids.includes(a.id)} manaSet={total > 0}
                onCast={() => (a.buff && a.canRide ? castFromHand(a.id) : removeFromHand(a.id))}
                onRemove={() => removeFromHand(a.id)} onInfo={() => openInfo(a)} />
            ))}
          </div>

          {handSupport.length > 0 && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: HDR }}>Other permanents</div>
              <p className="text-[10px] mb-1.5" style={{ color: "#6f6a5d" }}>Not scored — casting one puts it on your Board (no Light-Paws trigger).</p>
              <div className="grid gap-1.5 mb-3">
                {handSupport.map((x) => (
                  <div key={x.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="min-w-0">
                      <div className="font-bold text-[14px]" style={{ color: "#f0ead9" }}>{x.name}</div>
                      <div className="text-[11px]" style={{ color: x.relevant ? "#93c7e6" : "#8b8778" }}>{x.relevant ? "affects your Auras" : x.typeLine}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => castSupport(x.id)} className="text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Cast</button>
                      <button onClick={() => removeFromHand(x.id)} className="rounded-lg px-1.5 py-1.5" style={{ background: "rgba(255,255,255,0.06)" }}><X size={15} style={{ color: "#8b8778" }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <button onClick={p.onOpenWeights} className="text-xs flex items-center gap-1 mb-4" style={{ color: "#8b8778" }}>
        <Settings size={13} /> Adjust scoring weights
      </button>
    </div>
  );
}

function WeightRow({ label, wkey, weights, setWeights, step, min, max }) {
  const v = weights[wkey];
  const upd = (d) => setWeights((w) => {
    let nv = Math.round((w[wkey] + d) * 100) / 100;
    nv = Math.max(min, Math.min(max, nv));
    return { ...w, [wkey]: nv };
  });
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[12px]" style={{ color: "#cfc9ba" }}>{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <button onClick={() => upd(-step)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Minus size={12} style={{ color: "#ece7db" }} /></button>
        <span className="text-sm font-bold w-10 text-center" style={{ color: "#e8b84b" }}>{v}</span>
        <button onClick={() => upd(step)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Plus size={12} style={{ color: "#ece7db" }} /></button>
      </span>
    </div>
  );
}

function WeightsEditor({ weights, setWeights }) {
  const kwRows = [["flying", "Flying"], ["firstStrike", "First strike"], ["doubleStrike", "Double strike (× power)"], ["vigilance", "Vigilance"], ["lifelink", "Lifelink"], ["ward", "Ward"], ["totemArmor", "Totem armor"], ["hexproof", "Hexproof"], ["indestructible", "Indestructible"], ["protection", "Protection"]];
  const Hd = ({ children }) => <div className="text-[11px] font-bold uppercase tracking-wide mt-3 mb-0.5" style={{ color: HDR }}>{children}</div>;
  const kw = (k, l) => <WeightRow key={k} label={l} wkey={k} weights={weights} setWeights={setWeights} step={1} min={0} max={12} />;
  return (
    <div>
      <p className="text-[11px] mb-1" style={{ color: "#8b8778" }}>Tweak what each effect is worth. Changes apply instantly to every ranking and save on this device.</p>
      <Hd>Keywords</Hd>
      {kwRows.map(([k, l]) => kw(k, l))}
      <Hd>Stats (per +1)</Hd>
      <WeightRow label="Power" wkey="P_VAL" weights={weights} setWeights={setWeights} step={0.5} min={0} max={5} />
      <WeightRow label="Toughness" wkey="T_VAL" weights={weights} setWeights={setWeights} step={0.5} min={0} max={5} />
      <Hd>Effects</Hd>
      <WeightRow label="Card draw (each)" wkey="DRAW_VAL" weights={weights} setWeights={setWeights} step={0.5} min={0} max={10} />
      <WeightRow label="Token now" wkey="TOKEN_NOW" weights={weights} setWeights={setWeights} step={0.5} min={0} max={10} />
      <WeightRow label="Token conditional" wkey="TOKEN_COND" weights={weights} setWeights={setWeights} step={0.25} min={0} max={10} />
      <WeightRow label="ETB removal" wkey="ETB_REMOVAL" weights={weights} setWeights={setWeights} step={0.5} min={0} max={10} />
      <Hd>Lethal</Hd>
      <WeightRow label="Bonus when a play reaches lethal" wkey="LETHAL_BONUS" weights={weights} setWeights={setWeights} step={5} min={0} max={100} />
      <Hd>Double-strike connect chance</Hd>
      <WeightRow label="Evasive (flying / pro)" wkey="CONNECT_EVASIVE" weights={weights} setWeights={setWeights} step={0.05} min={0} max={1} />
      <WeightRow label="Ground (likely blocked)" wkey="CONNECT_GROUND" weights={weights} setWeights={setWeights} step={0.05} min={0} max={1} />
      <button onClick={() => setWeights({ ...DEFAULT_WEIGHTS })} className="mt-3 text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.08)", color: "#cfc9ba" }}>Reset to defaults</button>
    </div>
  );
}

function HandRow({ aura, info, ctx, rec, manaSet, onCast, onRemove, onInfo }) {
  const { affordable, marginal } = info || {};
  const h = useTapHold(() => {}, () => onInfo());
  const stop = (e) => e.stopPropagation();
  const short = manaSet && affordable === false; // only "unaffordable" when mana is actually tracked
  return (
    <div {...h} className="rounded-lg px-3 py-2 transition"
      style={{ background: "rgba(255,255,255,0.04)", border: rec ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.08)", opacity: short ? 0.6 : 1, touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "#f0ead9" }}>
            {rec && <Star size={12} style={{ color: "#e8b84b" }} fill="#e8b84b" />}
            {aura.name} <ManaCost aura={aura} />
            {rec && <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#a8a293" }}>best</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px]">
            {statLabel(aura, ctx) && <span className="font-bold" style={{ color: "#cfc9ba" }}>{statLabel(aura, ctx)}</span>}
            {marginal > 0.5 && <span style={{ color: "#93c7e6" }}>+{marginal.toFixed(1)} value</span>}
            {!aura.buff && <span style={{ color: "#8b8778" }}>removal</span>}
            {short && <span style={{ color: "#c98a8a" }}>short on mana ({aura.cost.w}W · {aura.cmc} total)</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={(e) => { stop(e); onCast(); }} onPointerDown={stop} onPointerUp={stop}
            className="text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Cast</button>
          <button onClick={(e) => { stop(e); onRemove(); }} onPointerDown={stop} onPointerUp={stop} className="rounded-lg px-1.5 py-1.5" style={{ background: "rgba(255,255,255,0.06)" }} title="Remove from hand"><X size={15} style={{ color: "#8b8778" }} /></button>
        </div>
      </div>
    </div>
  );
}

function PlayRow({ aura, info, ctx, rec, onTap, removal, onInfo }) {
  const { onBoard, affordable, marginal, redundant } = info || {};
  const h = useTapHold(removal ? undefined : onTap, () => onInfo(aura));
  let bg = "rgba(255,255,255,0.04)", border = "1px solid rgba(255,255,255,0.08)", opacity = 1;
  if (onBoard) { bg = "linear-gradient(160deg, rgba(232,184,75,0.22), rgba(232,184,75,0.08))"; border = "1px solid #e8b84b"; }
  else if (!affordable) opacity = 0.5;
  else if (redundant) opacity = 0.38;
  return (
    <div {...h} className="rounded-lg px-3 py-2 transition"
      style={{ background: bg, border: rec && !onBoard ? "1.5px solid #e8b84b" : border, opacity, cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {onBoard && <Check size={14} style={{ color: "#e8b84b" }} />}
            {!affordable && !onBoard && <Lock size={12} style={{ color: "#6f6a5d" }} />}
            <span className="font-bold text-[15px]" style={{ color: "#f0ead9", textDecoration: redundant && !onBoard ? "line-through" : "none" }}>{aura.name}</span>
            <ManaCost aura={aura} />
            {rec && !onBoard && <span className="text-[9px] uppercase font-bold rounded px-1 py-0.5" style={{ background: "#e8b84b", color: "#221a09" }}>pick</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {statLabel(aura, ctx) && <span className="text-[11px] font-bold" style={{ color: "#cfc9ba" }}>{statLabel(aura, ctx)}</span>}
            {aura.kw.map((k) => {
              const owned = k !== "protection" && hasKw(ctx.have, k) && !onBoard;
              return <span key={k} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: owned ? "rgba(255,255,255,0.06)" : "rgba(93,166,214,0.18)", color: owned ? "#6f6a5d" : "#93c7e6", textDecoration: owned ? "line-through" : "none" }}>{KW[k].label}</span>;
            })}
            {aura.etbRemoval && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(214,93,93,0.18)", color: "#e39" }}>Removal ETB</span>}
            {removal && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(214,93,93,0.18)", color: "#e6939a" }}>Removal</span>}
            {!aura.canRide && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(214,93,93,0.18)", color: "#e6939a" }}>Can't ride</span>}
          </div>
          {aura.note && <div className="text-[10.5px] italic mt-0.5" style={{ color: "#7d7869" }}>{aura.note}</div>}
        </div>
        {!removal && !onBoard && affordable && (
          <div className="text-right flex-shrink-0">
            <div className="text-[9px] uppercase" style={{ color: "#6f6a5d" }}>value</div>
            <div className="text-lg font-bold leading-none" style={{ color: redundant ? "#6f6a5d" : "#e8b84b" }}>{marginal.toFixed(1)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================== TAB 3 · DECK ====================== */
function DeckTab({ decks, activeId, onImport, importing, selectDeck, deleteDeck, renameDeck, synced, onViewList }) {
  const [imp, setImp] = useState("");
  const [name, setName] = useState("");
  const [report, setReport] = useState(null);
  const [replaceId, setReplaceId] = useState("");

  const [linkBusy, setLinkBusy] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const isLink = isDeckUrl(imp);
  const busy = importing || linkBusy;

  const run = async () => {
    if (busy || !imp.trim()) return;
    setLinkErr(""); setReport(null);
    let text = imp, fetchedName = "", site = "";
    if (isLink) {
      setLinkBusy(true);
      try { const d = await deckFromUrl(imp); text = d.text; fetchedName = d.name; site = d.site; }
      catch (e) { setLinkErr(e.message || "Couldn't load that link."); setLinkBusy(false); return; }
      setLinkBusy(false);
    }
    const nm = name.trim() || (replaceId ? (decks.find((d) => d.id === replaceId) || {}).name : "") || fetchedName || `Deck ${decks.length + 1}`;
    const res = await onImport(text, nm, replaceId || null);
    if (res && res.error) { setLinkErr(res.error); return; }       // keep the input so it can be fixed
    track("import/" + (site ? site.toLowerCase() : "text"));
    setReport({ ...res, site }); setImp(""); setName(""); setReplaceId("");
  };

  return (
    <div className="px-3 pt-4">
      <div className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: HDR }}>Deck · your saved decks</div>
      <p className="text-xs mb-3" style={{ color: "#8b8778" }}>Import a Light-Paws decklist, then pick which deck you're playing. Everything saves on this device only.</p>

      {/* import */}
      <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(232,184,75,0.09)", border: "1.5px solid rgba(232,184,75,0.55)" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Upload size={14} style={{ color: "#e8b84b" }} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>Import a decklist</span>
        </div>
        <textarea value={imp} onChange={(e) => { setImp(e.target.value); setLinkErr(""); }} rows={5}
          placeholder={"Paste a deck link (Archidekt / Moxfield / MTGGoldfish)\n— or the full decklist text —\n\n1 Light-Paws, Emperor's Voice\n1 Ethereal Armor\n..."}
          className="w-full rounded-lg p-2 text-sm outline-none" style={{ background: "rgba(0,0,0,0.35)", color: "#ece7db", border: "1px solid rgba(232,184,75,0.35)" }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name (e.g. Light-Paws 1)"
          className="w-full rounded-lg p-2 text-sm outline-none mt-2" style={{ background: "rgba(0,0,0,0.35)", color: "#ece7db", border: "1px solid rgba(255,255,255,0.15)" }} />
        {decks.length > 0 && (
          <select value={replaceId} onChange={(e) => setReplaceId(e.target.value)}
            className="w-full rounded-lg p-2 text-sm outline-none mt-2" style={{ background: "rgba(0,0,0,0.35)", color: "#ece7db", border: "1px solid rgba(255,255,255,0.15)" }}>
            <option value="">Save as a new deck</option>
            {decks.map((d) => <option key={d.id} value={d.id}>Overwrite: {d.name}</option>)}
          </select>
        )}
        {isLink && !busy && <div className="text-[11px] mt-2" style={{ color: "#93c7e6" }}>Deck link detected — the list will be pulled from the site{name.trim() ? "" : " (and named from it)"}.</div>}
        <button onClick={run} disabled={busy || !imp.trim()} className="w-full mt-2 text-sm font-bold rounded-lg py-2.5"
          style={{ background: busy || !imp.trim() ? "rgba(232,184,75,0.4)" : "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
          {linkBusy ? "Loading deck…" : importing ? "Importing…" : isLink ? "Import from link" : "Import deck"}
        </button>
        {linkErr && <div className="text-[11px] mt-2 leading-snug" style={{ color: "#e6939a" }}>{linkErr}</div>}
        {report && (
          <div className="text-[11px] mt-2 leading-snug" style={{ color: "#b7b1a2" }}>
            <span style={{ color: "#8fd39a" }}>Saved {report.total} cards{report.unique !== report.total ? ` (${report.unique} unique)` : ""}{report.site ? ` from ${report.site}` : ""}</span> — {report.auras} auras playable, {report.support} other permanents for the Board tab.
            {report.prints > 0 && <span> Kept your printings for {report.prints} card{report.prints === 1 ? "" : "s"}.</span>}
            {report.total > 100 && <span style={{ color: "#e8b84b" }}> That's over 100: open View list → Edit to mark sideboard cards.</span>}
            {report.rejected.length > 0 && <span> Couldn't read {report.rejected.length}: {report.rejected.slice(0, 4).join(", ")}{report.rejected.length > 4 ? "…" : ""}.</span>}
          </div>
        )}
      </div>

      {synced && <div className="text-[11px] mb-3" style={{ color: "#8fd39a" }}>✓ Card data synced from Scryfall</div>}

      {/* saved decks */}
      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: HDR }}>Your decks ({decks.length})</div>
      {decks.length === 0 ? (
        <div className="rounded-xl p-4 text-center text-sm mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "#8b8778" }}>
          No decks yet — paste your Light-Paws deck link or decklist above to get started.
        </div>
      ) : (
        <div className="grid gap-1.5 mb-4">
          {decks.map((d) => {
            const on = d.id === activeId;
            const inDeck = inDeckCount(d), side = deckCount(d) - inDeck;
            return (
              <div key={d.id} className="rounded-lg px-3 py-2.5" style={{ background: on ? "rgba(232,184,75,0.14)" : "rgba(255,255,255,0.04)", border: on ? "1.5px solid #e8b84b" : "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => { if (!on) selectDeck(d.id); }} className="text-left min-w-0 flex-1">
                    <div className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "#f0ead9" }}>
                      {on && <Check size={14} style={{ color: "#e8b84b" }} />}{d.name}
                      {d.sample && <span className="text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5" style={{ color: "#a8a293", border: "1px solid rgba(255,255,255,0.15)" }}>sample</span>}
                    </div>
                    <div className="text-[11px]" style={{ color: "#8b8778" }}>
                      {inDeck} cards{side > 0 ? ` + ${side} sideboard` : ""} · {(d.auras || []).length} auras · {(d.support || []).length} other permanents
                      {on && <span style={{ color: "#ece7db" }}> · playing now</span>}
                    </div>
                    {inDeck > 100 && <div className="text-[11px] font-semibold mt-0.5" style={{ color: "#e6939a" }}>{inDeck - 100} over 100: tap Edit and mark sideboard cards</div>}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => onViewList(d.id)}
                    className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-md" style={{ background: "rgba(232,184,75,0.16)", color: "#e8b84b", border: "1px solid rgba(232,184,75,0.45)" }}>
                    <Layers size={13} /> View list
                  </button>
                  <button onClick={() => onViewList(d.id, true)}
                    className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-md" style={BTN_2}>
                    <Pencil size={12} /> Edit
                  </button>
                  <div className="flex-1" />
                  {!d.sample && <button onClick={() => { const n = prompt("Rename deck", d.name); if (n && n.trim()) renameDeck(d.id, n.trim()); }}
                    className="text-[11px] px-2 py-1.5 rounded-md" style={BTN_2}>Rename</button>}
                  {!d.sample && <button onClick={() => { if (confirm(`Delete "${d.name}"?`)) deleteDeck(d.id); }} aria-label={`Delete ${d.name}`}
                    className="rounded-md px-1.5 py-1.5" style={BTN_2}><X size={14} style={{ color: "#c98a8a" }} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] mb-6" style={{ color: "#6f6a5d" }}>Tap a deck's name to play it. View list shows every card without switching decks; tap a card there and swipe to pick the printing you own. Edit adds or removes cards and marks sideboard cards, even mid-game. The sample deck is always here; editing it saves your own copy.</p>
    </div>
  );
}

// Full-screen list of one deck's cards. Viewing never switches decks (switching clears the game state).
// Edit mode adds/removes cards and marks sideboard cards; it never resets the game in progress.
function DeckListSheet({ deck, playing, onPlay, onClose, onPick, chosenPrints, openInfoCard, startEdit, setCardQty, toggleOut, addCardByName, onCopy }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(!!startEdit);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, []);
  const cards = deck.all || [];
  const out = new Set(deck.out || []);
  const isOut = (c) => out.has(norm(c.name));
  const inDeck = inDeckCount(deck), side = deckCount(deck) - inDeck;
  const shown = cards.filter((c) => !q || norm(c.name).includes(norm(q)) || norm(c.typeLine || "").includes(norm(q)))
    .slice().sort((a, b) => a.name.localeCompare(b.name));
  const group = (c) => {
    if (isOut(c)) return "Sideboard";
    const t = (c.typeLine || "").toLowerCase();
    if (/aura/.test(t)) return "Auras";
    if (/land/.test(t)) return "Lands";
    if (/creature/.test(t)) return "Creatures";
    if (/enchantment/.test(t)) return "Enchantments";
    if (/artifact/.test(t)) return "Artifacts";
    return "Other";
  };
  const order = ["Auras", "Creatures", "Enchantments", "Artifacts", "Lands", "Other", "Sideboard"];
  const grouped = order.map((g) => [g, shown.filter((c) => group(c) === g)]).filter(([, list]) => list.length);
  const [basics, setBasics] = useState(false);
  const have = new Set(cards.map((c) => norm(c.name)));
  const upgrades = LIBRARY.filter((a) => a.buff && !have.has(norm(a.name)));
  const playable = cards.filter((c) => !isOut(c));
  const deckBuy = playable.length ? tcgLink(tcgMassEntryUrl(playable, basics), "deck-buy") : null;
  const locked = editing && deck.sample;          // the sample itself can't be edited — make a copy first
  const canEdit = editing && !deck.sample;
  const addUpgrade = async (name) => { try { await addCardByName(deck.id, name); } catch (e) { alert(e.message); } };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" role="dialog" aria-modal="true" aria-label={`${deck.name} card list`}
      style={{ ...SANS, background: "#12151f", color: "#ece7db" }}>
      <div className="safe-top" style={{ borderBottom: "1px solid rgba(232,184,75,0.25)", background: "#161a26" }}>
        <div className="max-w-lg mx-auto px-3 pt-3 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight truncate" style={{ color: "#f0ead9" }}>{deck.name}</div>
              <div className="text-[11px]" style={{ color: "#8b8778" }}>
                {q ? `${shown.length} of ${cards.length} unique` : `${inDeck} cards${side ? ` + ${side} sideboard` : ""} · ${cards.length} unique`}
                {playing && <span style={{ color: "#ece7db" }}> · playing now</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 text-[12px] font-bold rounded-lg px-2.5 py-1.5"
                style={editing ? BTN_GOLD : BTN_2}>{editing ? <><Check size={13} /> Done</> : <><Pencil size={12} /> Edit</>}</button>
              <button onClick={onClose} aria-label="Close list" className="p-1.5 rounded-lg" style={BTN_2}><X size={18} /></button>
            </div>
          </div>
          {inDeck > 100 && (
            <div className="text-[11.5px] mt-2 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(230,147,154,0.12)", color: "#e6939a", border: "1px solid rgba(230,147,154,0.35)" }}>
              {inDeck - 100} over 100. {editing ? "Tap Sideboard on the cards you aren't playing." : "Tap Edit, then Sideboard on the cards you aren't playing."}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mt-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <Search size={16} style={{ color: "#8b8778" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter this deck…" className="bg-transparent outline-none text-sm w-full" style={{ color: "#ece7db" }} />
            {q && <button onClick={() => setQ("")} aria-label="Clear filter"><X size={15} style={{ color: "#8b8778" }} /></button>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-3 pt-3 pb-8">
          {locked && (
            <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="text-[12px] mb-2" style={{ color: "#cfc9ba" }}>The sample deck always stays as shipped. Make your own copy to add, remove or sideboard cards. Your current game carries over.</p>
              <button onClick={() => { onCopy(); }} className="w-full text-sm font-bold rounded-lg py-2" style={BTN_GOLD}>Make my own copy to edit</button>
            </div>
          )}
          {canEdit && <AddCardBox onAdd={(name) => addCardByName(deck.id, name)} />}
          {!editing && <p className="text-[11px] mb-3" style={{ color: "#8b8778" }}>Tap a card to see it full size, then swipe left or right through its printings to pick the one you own.</p>}
          {grouped.map(([g, list]) => (
            <div key={g} className="mb-3">
              <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: HDR }}>{g} ({list.reduce((n, c) => n + (c.qty || 1), 0)})</div>
              {g === "Sideboard" && <p className="text-[10.5px] mb-1.5" style={{ color: "#6f6a5d" }}>Not counted in the deck and not offered on Cast, Fetch or Board.</p>}
              <div className="grid gap-1.5">
                {list.map((c) => canEdit
                  ? <DeckEditRow key={c.name} card={c} out={isOut(c)}
                      onQty={(n) => { if (n <= 0 && !confirm(`Remove ${c.name} from this deck?`)) return; setCardQty(deck.id, c.name, n); }}
                      onToggleOut={() => toggleOut(deck.id, c.name)} />
                  : <DeckCardRow key={c.name} card={c} out={isOut(c)} chosen={chosenPrints[c.name]} onOpen={() => onPick({ name: c.name })} />)}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <div className="text-sm italic py-6 text-center" style={{ color: "#6f6a5d" }}>No cards match "{q}".</div>}

          {!q && upgrades.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: HDR }}>Upgrade ideas ({upgrades.length})</div>
              <p className="text-[11px] mb-2" style={{ color: "#8b8778" }}>Light-Paws Auras this deck doesn't run yet. Tap one to see it{canEdit ? ", or Add to put it in the deck" : ""}.</p>
              <div className="grid gap-1.5">
                {upgrades.map((a) => (
                  <div key={a.id} className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.14)" }}>
                    <button onClick={() => onPick({ name: a.name })} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2"><span className="font-semibold text-[14px]" style={{ color: "#f0ead9" }}>{a.name}</span><ManaCost aura={a} /></div>
                      {a.note && <div className="text-[10.5px] mt-0.5" style={{ color: "#8b8778" }}>{a.note}</div>}
                    </button>
                    {canEdit && <button onClick={() => addUpgrade(a.name)} className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1 flex-shrink-0" style={BTN_GOLD}><Plus size={12} /> Add</button>}
                    {AFFILIATE_TCGPLAYER && <div className="flex-shrink-0"><BuyLink compact href={tcgLink(tcgCardUrl(a.name), "upgrade")} label="Buy" sub="upgrade" /></div>}
                  </div>
                ))}
              </div>
              {AFFILIATE_TCGPLAYER && <div className="text-[10.5px] mt-1.5" style={{ color: "#8b8778" }}>Buy buttons are affiliate links that support the app.</div>}
            </div>
          )}
        </div>
      </div>

      <div className="safe-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#161a26" }}>
        <div className="max-w-lg mx-auto px-3 py-2.5">
          {deckBuy && (
            <div className={playing ? "" : "mb-2"}>
              <div className="flex gap-2 items-stretch">
                <a href={deckBuy} target="_blank" rel="sponsored noopener noreferrer" onClick={() => track("buy/deck-buy")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold rounded-lg py-2.5"
                  style={{ background: "rgba(147,199,230,0.14)", color: "#93c7e6", border: "1px solid rgba(147,199,230,0.35)" }}>
                  <ShoppingCart size={15} /> Buy this deck on TCGplayer <ExternalLink size={12} />
                </a>
                <label className="flex items-center gap-1.5 text-[11px] px-2 rounded-lg cursor-pointer" style={{ color: "#b7b1a2", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)" }}>
                  <input type="checkbox" checked={basics} onChange={(e) => setBasics(e.target.checked)} /> Basics
                </label>
              </div>
              <div className="text-[10.5px] text-center mt-1" style={{ color: "#8b8778" }}>Affiliate link: opens your list (without sideboard) in TCGplayer's cart. Supports the app at no extra cost.</div>
            </div>
          )}
          {!playing && (
            <button onClick={() => { if (confirm(`Play "${deck.name}"? This clears your current hand, attached auras and board.`)) onPlay(); }}
              className="w-full text-sm font-bold rounded-lg py-2.5" style={BTN_GOLD}>
              Play this deck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeckCardRow({ card, chosen, onOpen, out }) {
  return (
    <button onClick={onOpen} className="w-full text-left rounded-lg px-3 py-2"
      style={{ background: "rgba(255,255,255,0.04)", border: chosen ? "1px solid rgba(232,184,75,0.6)" : "1px solid rgba(255,255,255,0.1)", opacity: out ? 0.6 : 1 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[14px]" style={{ color: "#f0ead9" }}>{card.qty > 1 && <span style={{ color: "#cfc9ba" }}>{card.qty}× </span>}{card.name}</span>
        <ScryCost cost={card.manaCost} />
      </div>
      <div className="text-[10.5px] mt-0.5" style={{ color: "#8b8778" }}>{card.typeLine || "Loading card type…"}</div>
      <div className="text-[10px] mt-1 font-semibold" style={{ color: chosen ? "#e8b84b" : "#8b8778" }}>
        {chosen ? `✓ ${(chosen.setName || (chosen.set || "").toUpperCase())} #${chosen.collector}` : "Tap to choose your printing"}
      </div>
    </button>
  );
}

function DeckEditRow({ card, out, onQty, onToggleOut }) {
  const q = card.qty || 1;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-[14px] truncate" style={{ color: out ? "#8b8778" : "#f0ead9" }}>{card.name}</div>
          <div className="text-[10.5px] truncate" style={{ color: "#8b8778" }}>{card.typeLine}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleOut} aria-pressed={out} className="text-[10.5px] font-bold rounded-full px-2 py-1"
            style={out ? BTN_GOLD : BTN_2}>{out ? "Sideboard ✓" : "Sideboard"}</button>
          <button onClick={() => onQty(q - 1)} aria-label={q > 1 ? `One fewer ${card.name}` : `Remove ${card.name}`} className="w-7 h-7 rounded flex items-center justify-center" style={BTN_2}>
            {q > 1 ? <Minus size={13} /> : <Trash2 size={13} style={{ color: "#e6939a" }} />}
          </button>
          <span className="text-sm font-bold w-5 text-center" style={{ color: "#f0ead9" }}>{q}</span>
          <button onClick={() => onQty(q + 1)} aria-label={`One more ${card.name}`} className="w-7 h-7 rounded flex items-center justify-center" style={BTN_2}><Plus size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// Search Scryfall by name and add the card to the deck
function AddCardBox({ onAdd }) {
  const [q, setQ] = useState("");
  const [sug, setSug] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const t0 = q.trim();
    if (t0.length < 2) { setSug([]); return; }
    let ok = true;
    const t = setTimeout(async () => {
      try {
        const r = await fetch("https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(t0), { headers: { Accept: "application/json" } });
        const d = await r.json();
        if (ok) setSug((d.data || []).slice(0, 8));
      } catch { if (ok) setSug([]); }
    }, 250);
    return () => { ok = false; clearTimeout(t); };
  }, [q]);
  const add = async (name) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    try { const n = await onAdd(name); setMsg({ ok: true, text: `Added ${n}.` }); setQ(""); setSug([]); }
    catch (e) { setMsg({ ok: false, text: e.message || "Couldn't add that card." }); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: HDR }}>Add a card</div>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.16)" }}>
        <Plus size={16} style={{ color: "#8b8778" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && sug[0]) add(sug[0]); }}
          placeholder="Card name…" className="bg-transparent outline-none text-sm w-full" style={{ color: "#ece7db" }} />
        {busy && <span className="text-[11px]" style={{ color: "#8b8778" }}>Adding…</span>}
      </div>
      {sug.length > 0 && (
        <div className="grid gap-1 mt-1.5">
          {sug.map((n) => (
            <button key={n} onClick={() => add(n)} disabled={busy} className="flex items-center justify-between rounded-lg px-3 py-2 text-left" style={BTN_2}>
              <span className="text-[13px] font-semibold" style={{ color: "#e6dfce" }}>{n}</span>
              <span className="inline-flex items-center justify-center rounded-full" style={{ width: 24, height: 24, ...BTN_GOLD }}><Plus size={14} /></span>
            </button>
          ))}
        </div>
      )}
      {msg && <div className="text-[11px] mt-1.5" style={{ color: msg.ok ? "#8fd39a" : "#e6939a" }}>{msg.text}</div>}
    </div>
  );
}

// Close a dropdown when the user taps/clicks anywhere outside `ref`.
function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("pointerdown", h);
    document.addEventListener("touchstart", h, { passive: true });
    return () => { document.removeEventListener("pointerdown", h); document.removeEventListener("touchstart", h); };
  }, [open]);
}

function BrowseToggle({ open, onToggle }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onToggle}
      className="text-[11px] font-bold rounded-md px-2 py-1 flex-shrink-0 whitespace-nowrap"
      style={{ background: open ? "rgba(255,255,255,0.08)" : "rgba(232,184,75,0.2)", color: open ? "#cfc9ba" : "#e8b84b" }}>
      {open ? "Hide" : "Browse"}
    </button>
  );
}

function Card({ children }) { return <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>{children}</div>; }
function Lbl({ children, inline }) { return <div className={"text-xs font-bold uppercase tracking-wide " + (inline ? "" : "mb-2")} style={{ color: HDR }}>{children}</div>; }

function Step({ label, value, set, gold }) {
  return (
    <div className="flex-1 rounded-lg px-1.5 py-1" style={{ background: "rgba(255,255,255,0.05)", border: gold ? "1px solid rgba(232,184,75,0.5)" : "1px solid rgba(255,255,255,0.1)" }}>
      <div className="text-[10px] uppercase text-center truncate" style={{ color: "#8b8778" }}>{label}</div>
      <div className="flex items-center justify-between">
        <button onClick={() => set((v) => Math.max(0, v - 1))} className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Minus size={14} style={{ color: "#ece7db" }} /></button>
        <span className="text-xl font-bold" style={{ color: gold ? "#e8b84b" : "#f0ead9" }}>{value}</span>
        <button onClick={() => set((v) => v + 1)} className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Plus size={14} style={{ color: "#ece7db" }} /></button>
      </div>
    </div>
  );
}
function MiniStep({ value, set }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button onClick={() => set((v) => Math.max(0, v - 1))} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Minus size={12} style={{ color: "#ece7db" }} /></button>
      <span className="text-base font-bold w-5 text-center" style={{ color: "#f0ead9" }}>{value}</span>
      <button onClick={() => set((v) => v + 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Plus size={12} style={{ color: "#ece7db" }} /></button>
    </span>
  );
}

function MiniStepSigned({ value, set }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button onClick={() => set((v) => v - 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Minus size={12} style={{ color: "#ece7db" }} /></button>
      <span className="text-base font-bold w-7 text-center" style={{ color: value === 0 ? "#8b8778" : "#e8b84b" }}>{value > 0 ? "+" : ""}{value}</span>
      <button onClick={() => set((v) => v + 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Plus size={12} style={{ color: "#ece7db" }} /></button>
    </span>
  );
}

function Pip({ children, kind }) {
  const map = { W: ["#f4ead0", "#6b5212", "#d8b14a"], g: ["#d9d4c7", "#33302a", "#b4ab95"] };
  const [bg, fg, br] = map[kind] || map.g;
  return <span className="inline-flex items-center justify-center rounded-full font-bold" style={{ width: 16, height: 16, fontSize: 10, background: bg, color: fg, border: `1px solid ${br}` }}>{children}</span>;
}
function ManaCost({ aura }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {aura.cost.c > 0 && <Pip kind="g">{aura.cost.c}</Pip>}
      {Array.from({ length: aura.cost.w }).map((_, i) => <Pip key={i} kind="W">W</Pip>)}
    </span>
  );
}
function ScryCost({ cost }) {
  if (!cost) return null;
  const toks = cost.match(/\{[^}]+\}/g) || [];
  const color = (s) => ({ W: ["#f4ead0", "#6b5212"], U: ["#b3d7 f", "#0a3a5a"], B: ["#b9b0a6", "#1a1a1a"], R: ["#f0b0a0", "#6b1e10"], G: ["#b6d8b6", "#12401e"], C: ["#d9d4c7", "#33302a"] }[s] || ["#d9d4c7", "#33302a"]);
  return (
    <span className="inline-flex items-center gap-0.5 flex-shrink-0">
      {toks.map((tk, i) => {
        const s = tk.replace(/[{}]/g, "");
        const isNum = /^\d+$/.test(s) || s === "X";
        const [bg, fg] = isNum ? ["#d9d4c7", "#33302a"] : color(s);
        return <span key={i} className="inline-flex items-center justify-center rounded-full font-bold" style={{ width: 16, height: 16, fontSize: 9.5, background: bg, color: fg }}>{s}</span>;
      })}
    </span>
  );
}

function statLabel(a, ctx) {
  if (a.stat) return (a.stat.p === 0 && a.stat.t === 0) ? "" : `+${a.stat.p}/+${a.stat.t}`;
  if (a.scale) {
    const proj = { auras: ctx.counts.auras + 1, ench: ctx.counts.ench + 1, art: ctx.counts.art, plains: ctx.counts.plains };
    const s = resolveStat(a, proj);
    return (s.p === 0 && s.t === 0) ? "" : `+${s.p}/+${s.t}`;
  }
  return "";
}

// stops touch gestures inside from bubbling to the tab-swipe handler
function NoSwipe({ children, className, style }) {
  const stop = (e) => e.stopPropagation();
  return <div className={className} style={style} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}>{children}</div>;
}

function ManaChip({ label, value, set, gold }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: "rgba(255,255,255,0.05)", border: gold ? "1px solid rgba(232,184,75,0.5)" : "1px solid rgba(255,255,255,0.1)" }}>
      <span className="text-[10px] uppercase" style={{ color: "#8b8778" }}>{label}</span>
      <button onClick={() => set((v) => Math.max(0, v - 1))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Minus size={12} style={{ color: "#ece7db" }} /></button>
      <span className="text-base font-bold w-4 text-center" style={{ color: gold ? "#e8b84b" : "#f0ead9" }}>{value}</span>
      <button onClick={() => set((v) => v + 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Plus size={12} style={{ color: "#ece7db" }} /></button>
    </div>
  );
}

/* ---- TCGplayer affiliate links (opens in a new tab, always disclosed) ---- */
function tcgLink(dest, sub) {
  if (!AFFILIATE_TCGPLAYER) return null;
  return AFFILIATE_TCGPLAYER + (AFFILIATE_TCGPLAYER.includes("?") ? "&" : "?")
    + "subId1=" + encodeURIComponent(sub || "app") + "&u=" + encodeURIComponent(dest);
}
function tcgCardUrl(name, print) {
  if (print && print.tcgplayer_id) return "https://www.tcgplayer.com/product/" + print.tcgplayer_id;
  return "https://www.tcgplayer.com/search/magic/product?productLineName=magic&view=grid&q=" + encodeURIComponent(name);
}
const BASIC_RE = /^(snow-covered )?(plains|island|swamp|mountain|forest|wastes)$/i;
function tcgMassEntryUrl(cards, includeBasics) {
  const lines = cards.filter((c) => includeBasics || !BASIC_RE.test(c.name.trim()))
    .map((c) => `${c.qty || 1} ${c.name.split(" // ")[0]}`);
  return "https://www.tcgplayer.com/massentry?productline=Magic&c=" + encodeURIComponent(lines.join("||"));
}
function BuyLink({ href, label, sub, onClick, compact }) {
  if (!href) return null;
  return (
    <div className={compact ? "" : "mt-2"}>
      <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={() => { track("buy/" + (sub || "link")); onClick && onClick(); }}
        className={"w-full inline-flex items-center justify-center gap-1.5 font-bold rounded-lg " + (compact ? "text-[11px] px-2.5 py-1.5" : "text-sm py-2.5")}
        style={{ background: "rgba(147,199,230,0.14)", color: "#93c7e6", border: "1px solid rgba(147,199,230,0.35)" }}>
        <ShoppingCart size={compact ? 12 : 15} /> {label} <ExternalLink size={compact ? 10 : 12} />
      </a>
      {!compact && <div className="text-[10.5px] text-center mt-1" style={{ color: "#8b8778" }}>Affiliate link: buying through it supports the app at no extra cost to you.</div>}
    </div>
  );
}

function getImg(c) {
  if (!c) return null;
  if (c.image_uris) return c.image_uris.normal || c.image_uris.large;
  if (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris) return c.card_faces[0].image_uris.normal;
  return null;
}
function getImgSmall(c) {
  if (!c) return null;
  if (c.image_uris) return c.image_uris.small || c.image_uris.normal;
  if (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris) return c.card_faces[0].image_uris.small;
  return null;
}

// distinguishes a quick tap from a press-and-hold; pointer events fire once per
// interaction (touch OR mouse), which avoids the synthesized-click double-fire.
function useTapHold(onTap, onHold) {
  const timer = useRef(null), moved = useRef(false), longed = useRef(false), start = useRef({ x: 0, y: 0 }), active = useRef(false);
  const down = (e) => { active.current = true; moved.current = false; longed.current = false; start.current = { x: e.clientX, y: e.clientY }; timer.current = setTimeout(() => { longed.current = true; onHold && onHold(); }, 430); };
  const move = (e) => { if (!active.current) return; if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) { moved.current = true; clearTimeout(timer.current); } };
  const up = () => { if (!active.current) return; active.current = false; clearTimeout(timer.current); if (!longed.current && !moved.current) onTap && onTap(); };
  const cancel = () => { active.current = false; clearTimeout(timer.current); };
  return { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: cancel, onPointerLeave: cancel, onContextMenu: (e) => e.preventDefault() };
}

// tap = equip, hold = card info, plus button = equip
function EquipRow({ aura, ctx, onEquip, onInfo }) {
  const [confirm, setConfirm] = useState(false);
  const h = useTapHold(() => setConfirm(true), onInfo);
  const stop = (e) => e.stopPropagation();
  return (
    <div {...h}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition"
      style={{ background: confirm ? "rgba(232,184,75,0.12)" : "rgba(255,255,255,0.04)", border: confirm ? "1.5px solid #e8b84b" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="min-w-0">
        <div className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "#f0ead9" }}>{aura.name} <ManaCost aura={aura} /></div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {statLabel(aura, ctx) && <span className="text-[11px] font-bold" style={{ color: "#cfc9ba" }}>{statLabel(aura, ctx)}</span>}
          {aura.kw.map((k) => { const owned = k !== "protection" && hasKw(ctx.have, k); return <span key={k} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: owned ? "rgba(255,255,255,0.06)" : "rgba(93,166,214,0.18)", color: owned ? "#6f6a5d" : "#93c7e6", textDecoration: owned ? "line-through" : "none" }}>{KW[k].label}</span>; })}
        </div>
      </div>
      {confirm ? (
        <div className="flex items-center gap-1.5 flex-shrink-0" style={{ marginLeft: 8 }}>
          <button onClick={(e) => { stop(e); onEquip(); }} onPointerDown={stop} onPointerUp={stop} className="text-xs font-bold rounded-lg px-3 py-2" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Add</button>
          <button onClick={(e) => { stop(e); setConfirm(false); }} onPointerDown={stop} onPointerUp={stop} className="rounded-lg px-2 py-2" style={{ background: "rgba(255,255,255,0.08)" }}><X size={16} style={{ color: "#cfc9ba" }} /></button>
        </div>
      ) : (
        <button onClick={(e) => { stop(e); setConfirm(true); }} onPointerDown={stop} onPointerUp={stop}
          className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 34, height: 34, background: "rgba(232,184,75,0.15)", marginLeft: 8 }}>
          <Plus size={18} style={{ color: "#e8b84b" }} />
        </button>
      )}
    </div>
  );
}

function CardInfoModal({ aura, chosenPrint, onClose, onChoose }) {
  const [cur, setCur] = useState(null);
  const fixedStat = aura.stat && (aura.stat.p || aura.stat.t) ? `+${aura.stat.p}/+${aura.stat.t}` : "";
  const face = cur && (cur.oracle_text != null ? cur : (cur.card_faces && cur.card_faces[0]) || cur);
  const flavor = cur && (cur.flavor_text || (cur.card_faces && cur.card_faces[0] && cur.card_faces[0].flavor_text));
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl pt-4 pb-4" style={{ background: "#1a1e2b", border: "1px solid rgba(255,255,255,0.15)", maxHeight: "92vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-2 mb-1 px-4">
          <div className="font-bold text-lg" style={{ color: "#f0ead9" }}>{aura.name}</div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded flex-shrink-0" style={BTN_2}><X size={18} /></button>
        </div>
        <PrintCarousel name={aura.name} chosen={chosenPrint} onChoose={onChoose} onCurrent={setCur} maxW={250} />
        <div className="px-4">
          {cur && <BuyLink href={tcgLink(tcgCardUrl(cur.name, cur), "card-popup")} label="Buy on TCGplayer" sub="card-popup" />}
          <div className="flex items-center flex-wrap gap-2 mt-3 mb-2">
            {aura.cost && <ManaCost aura={aura} />}
            {fixedStat && <span className="text-sm font-bold" style={{ color: "#cfc9ba" }}>{fixedStat}</span>}
          </div>
          {face ? (
            <>
              <div className="text-[12px] mb-1" style={{ color: "#8b8778" }}>{face.type_line}</div>
              <div className="text-sm leading-snug whitespace-pre-line" style={{ color: "#d8d2c4" }}>{face.oracle_text}</div>
              {flavor && <div className="text-[12.5px] italic leading-snug mt-2 pt-2" style={{ color: "#9a9484", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{flavor}</div>}
            </>
          ) : (
            <div className="text-sm" style={{ color: "#b7b1a2" }}>{aura.note || ""}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Swipeable rail of every paper printing of a card, with "Use this printing".
// Used by the card popup (Active / Cast / Fetch) and the full-screen viewer (Deck list).
function PrintCarousel({ name, chosen, onChoose, onCurrent, maxW = 300 }) {
  const [prints, setPrints] = useState(null);
  const [state, setState] = useState("loading");
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(() => new Set([0, 1, 2]));
  const [hintSeen, setHintSeen] = useState(() => LS.get("swipeHintSeen", false));
  const railRef = useRef(null);
  const startIdx = useRef(0);

  useEffect(() => {
    let ok = true; setState("loading"); setPrints(null);
    const base = "https://api.scryfall.com/cards/search?order=released&unique=prints&q=" + encodeURIComponent('!"' + name + '"');
    (async () => {
      try {
        let u = base, all = [], pages = 0;
        while (u && pages < 5) {
          const r = await fetch(u, { headers: { Accept: "application/json" } });
          if (!r.ok) throw new Error(r.status);
          const d = await r.json();
          (d.data || []).forEach((c) => all.push(c));
          u = d.has_more ? d.next_page : null; pages++;
          if (u) await new Promise((res) => setTimeout(res, 90));
        }
        const paper = all.filter((c) => !c.digital);     // Arena/MTGO-only printings can't be in your paper deck
        const list = paper.length ? paper : all;
        if (ok) { setPrints(list); setState(list.length ? "ok" : "err"); }
      } catch { if (ok) setState("err"); }
    })();
    return () => { ok = false; };
  }, [name]);

  // open on the printing you already chose
  useLayoutEffect(() => {
    if (!prints || !railRef.current) return;
    const i = chosen ? Math.max(0, prints.findIndex((c) => c.set === chosen.set && c.collector_number === chosen.collector)) : 0;
    startIdx.current = i;
    railRef.current.scrollLeft = i * railRef.current.clientWidth;
    setIdx(i); setLoaded(new Set([i - 1, i, i + 1, i + 2]));
  }, [prints]);

  const cur = prints && prints[idx];
  useEffect(() => { onCurrent && onCurrent(cur || null); }, [cur]);

  const onScroll = () => {
    const el = railRef.current; if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i === idx) return;
    setIdx(i);
    setLoaded((s) => { const n = new Set(s); [i - 1, i, i + 1, i + 2].forEach((k) => n.add(k)); return n; });
    if (!hintSeen && i !== startIdx.current) { setHintSeen(true); LS.set("swipeHintSeen", true); }
  };
  const go = (d) => {
    const el = railRef.current; if (!el || !prints) return;
    const i = Math.min(prints.length - 1, Math.max(0, idx + d));
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const isChosen = !!(cur && chosen && chosen.set === cur.set && chosen.collector === cur.collector_number);
  const many = prints && prints.length > 1;
  if (state === "loading") return <div className="text-sm py-12 text-center" style={{ color: "#9a9484" }}>Loading printings…</div>;
  if (state === "err") return <div className="text-sm px-4 py-10 text-center" style={{ color: "#e6939a" }}>Couldn't load printings from Scryfall. Check your connection and open the card again.</div>;
  return (
    <div>
      <div className="relative">
        <div ref={railRef} onScroll={onScroll} className="flex overflow-x-auto no-scrollbar"
          style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch" }}>
          {prints.map((c, i) => {
            const src = loaded.has(i) ? getImg(c) : null;
            return (
              <div key={c.id} className="flex-shrink-0 w-full flex justify-center px-10 pt-3" style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}>
                <div className="w-full" style={{ maxWidth: maxW, aspectRatio: "488 / 680", borderRadius: "4.75% / 3.5%", overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
                  {src && <img src={src} alt={`${c.name}, ${c.set_name}`} draggable={false} className="w-full h-full card-img" style={{ objectFit: "cover" }} />}
                </div>
              </div>
            );
          })}
        </div>
        {many && idx > 0 && (
          <button onClick={() => go(-1)} aria-label="Previous printing" className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(18,21,31,0.8)", border: "1px solid rgba(255,255,255,0.25)" }}><ChevronLeft size={18} style={{ color: "#cfc9ba" }} /></button>
        )}
        {many && idx < prints.length - 1 && (
          <button onClick={() => go(1)} aria-label="Next printing" className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(18,21,31,0.8)", border: "1px solid rgba(255,255,255,0.25)" }}><ChevronRight size={18} style={{ color: "#cfc9ba" }} /></button>
        )}
      </div>
      <div className="px-4 mt-2.5">
        {many && (
          <div className={"text-center text-[12px] mb-1.5 " + (hintSeen ? "" : "swipe-hint")} style={{ color: hintSeen ? "#6f6a5d" : "#93c7e6" }}>
            {hintSeen ? `Printing ${idx + 1} of ${prints.length} · swipe for others` : "Swipe left or right to see every printing"}
          </div>
        )}
        {cur && (
          <div className="text-center mb-2.5">
            <div className="text-sm font-bold" style={{ color: "#f0ead9" }}>{cur.set_name}</div>
            <div className="text-[11px]" style={{ color: "#8b8778" }}>
              {(cur.set || "").toUpperCase()} #{cur.collector_number}{cur.released_at ? `, ${cur.released_at.slice(0, 4)}` : ""}{cur.artist ? `. Illustrated by ${cur.artist}` : ""}
            </div>
          </div>
        )}
        {cur && onChoose && (
          <button disabled={isChosen}
            onClick={() => onChoose({ set: cur.set, collector: cur.collector_number, setName: cur.set_name, img: getImg(cur), artist: cur.artist, tcgplayer_id: cur.tcgplayer_id })}
            className="w-full text-sm font-bold rounded-lg py-2.5 inline-flex items-center justify-center gap-1.5"
            style={isChosen ? { background: "rgba(143,211,154,0.14)", color: "#8fd39a", border: "1px solid rgba(143,211,154,0.4)" } : BTN_GOLD}>
            {isChosen ? <><Check size={15} /> Your printing</> : "Use this printing"}
          </button>
        )}
      </div>
    </div>
  );
}

// Full-screen card view: swipe left/right through every paper printing, tap "Use this printing" to keep it.
function CardViewer({ card, chosen, onChoose, onClose }) {
  const [cur, setCur] = useState(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, []);
  const face = cur && (cur.oracle_text != null ? cur : (cur.card_faces && cur.card_faces[0]) || cur);
  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label={`${card.name} printings`}
      style={{ ...SANS, background: "#12151f", color: "#ece7db" }}>
      <div className="safe-top" style={{ borderBottom: "1px solid rgba(232,184,75,0.25)", background: "#161a26" }}>
        <div className="max-w-lg mx-auto px-3 py-3 flex items-start justify-between gap-2">
          <div className="font-bold text-lg leading-tight truncate min-w-0" style={{ color: "#f0ead9" }}>{card.name}</div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg flex-shrink-0" style={BTN_2}><X size={18} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto pb-6">
          <PrintCarousel name={card.name} chosen={chosen} onChoose={onChoose} onCurrent={setCur} />
          <div className="px-4">
            {cur && <BuyLink href={tcgLink(tcgCardUrl(cur.name, cur), "card-viewer")} label="Buy this printing on TCGplayer" sub="card-viewer" />}
            {face && (face.type_line || face.oracle_text) && (
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-[12px] mb-1" style={{ color: "#8b8778" }}>{face.type_line}</div>
                <div className="text-sm leading-snug whitespace-pre-line" style={{ color: "#d8d2c4" }}>{face.oracle_text}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function summaryLine(ev) {
  const parts = [];
  if (ev.addP || ev.addT) parts.push(`+${ev.addP}/+${ev.addT}`);
  if (ev.gainedKw && ev.gainedKw.length) parts.push(ev.gainedKw.join(", "));
  if (ev.draws) parts.push(`draw ${ev.draws}`);
  return parts.join(" · ");
}

// collapsible "what's on Light-Paws right now" summary for the Cast/Fetch tabs
function BoardPeek({ curPower, curTough, curDS, ctx, equippedIds, deckAuras, byName }) {
  const [open, setOpen] = useState(false);
  const kws = KW_ORDER.filter((k) => hasKw(ctx.have, k));
  const shown = open ? kws : kws.slice(0, 5);
  const extra = kws.length - shown.length;
  return (
    <div className="mb-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full rounded-lg px-3 py-2"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: "#f0ead9" }}>
            {curPower}/{curTough}{curDS && <span style={{ color: "#e8b84b" }}> ×2={curPower * 2}</span>}
          </span>
          <span className="flex items-center gap-1 overflow-hidden flex-wrap justify-end">
            {shown.map((k) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: "rgba(232,184,75,0.18)", color: "#e8b84b" }}>{KW[k].label}</span>
            ))}
            {kws.length === 0 && <span className="text-[11px] italic" style={{ color: "#6f6a5d" }}>no keywords</span>}
            {extra > 0 && <span className="text-[10px]" style={{ color: "#8b8778" }}>+{extra} more</span>}
            <span className="text-[11px] ml-1 inline-flex items-center gap-1" style={{ color: "#cfc9ba" }}>
              {equippedIds.length}
              <span className="inline-flex items-center justify-center rounded-full" style={{ width: 20, height: 20, border: "1.5px solid #e8b84b", color: "#e8b84b" }}>
                <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
              </span>
            </span>
          </span>
        </div>
      </button>
      {open && (
        <div className="rounded-lg px-3 py-2 mt-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#8b8778" }}>Attached auras</div>
          <div className="flex flex-wrap gap-1">
            {equippedIds.map((id) => (
              <span key={id} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "#cfc9ba" }}>
                {(deckAuras.find((a) => a.id === id) || {}).name || byName(id)}
              </span>
            ))}
            {equippedIds.length === 0 && <span className="text-[11px] italic" style={{ color: "#6f6a5d" }}>Nothing attached</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function FetchRow({ a, ev, first, onEquip, onInfo }) {
  const h = useTapHold(() => onInfo(), () => onInfo());
  const stop = (e) => e.stopPropagation();
  return (
    <div {...h} className="text-left rounded-lg px-3 py-2 transition"
      style={{ background: "rgba(255,255,255,0.04)", border: first ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "#f0ead9" }}>
            {first && <Star size={13} style={{ color: "#e8b84b" }} fill="#e8b84b" />}
            {a.name} <ManaCost aura={a} />
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "#b7b1a2" }}>{summaryLine(ev) || "No new effect on your current board"}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-[9px] uppercase" style={{ color: "#6f6a5d" }}>value</div>
            <div className="text-base font-bold leading-none" style={{ color: "#f0ead9" }}>{ev.score.toFixed(1)}</div>
          </div>
          <button onClick={(e) => { stop(e); onEquip(); }} onPointerDown={stop} onPointerUp={stop}
            className="text-xs font-bold rounded-lg px-3 py-2" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Add</button>
        </div>
      </div>
    </div>
  );
}

/* ====================== TAB · BOARD (non-aura permanents you control) ====================== */
function BoardStateTab({ supportPool, onBoard, setOnBoard, boardCards, costReduction, drawPerAuraCast, equippedIds,
  white, setWhite, other, setOther, plains, setPlains, artifacts, setArtifacts, otherEnch, setOtherEnch, resetTurn }) {
  const [q, setQ] = useState("");
  const [browse, setBrowse] = useState(false);
  const searchRef = useRef(null);
  const total = white + other;
  const listOpen = !!q || browse;
  const boxRef = useRef(null);
  useOutsideClose(boxRef, listOpen, () => { setBrowse(false); setQ(""); if (searchRef.current) searchRef.current.blur(); });
  const toggle = (id) => setOnBoard((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const matches = supportPool
    .filter((x) => !onBoard.has(x.id) && (!q || norm(x.name).includes(norm(q)) || norm(x.typeLine || "").includes(norm(q))))
    .sort((a, b) => (b.relevant - a.relevant) || a.cmc - b.cmc || a.name.localeCompare(b.name));

  return (
    <div className="px-3 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: HDR }}>Board · everything else you control</div>
          <p className="text-xs mb-2" style={{ color: "#8b8778" }}>Your mana, other permanents, and the non-Aura cards in play that change how your Auras cast.</p>
        </div>
        <button onClick={resetTurn} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "#cfc9ba" }}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* mana */}
      <Card>
        <Lbl>Mana available</Lbl>
        <div className="flex gap-2">
          <Step label="White" value={white} set={setWhite} gold />
          <Step label="Other" value={other} set={setOther} />
          <div className="flex-1 flex flex-col items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] uppercase" style={{ color: "#8b8778" }}>Total</div>
            <div className="text-2xl font-bold" style={{ color: "#f0ead9" }}>{total}</div>
          </div>
        </div>
      </Card>

      {/* permanent counts */}
      <Card>
        <Lbl>Other permanents you control</Lbl>
        <div className="flex items-start justify-around gap-2">
          {[["Artifacts", artifacts, setArtifacts], ["Enchants", otherEnch, setOtherEnch], ["Plains", plains, setPlains]].map(([lbl, v, setV]) => (
            <div key={lbl} className="flex flex-col items-center gap-1">
              <MiniStep value={v} set={setV} />
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#8b8778" }}>{lbl}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "#6f6a5d" }}>Attached Auras are counted automatically. These feed auras that scale with permanents you control.</p>
      </Card>

      {/* effect summary */}
      {(costReduction > 0 || drawPerAuraCast > 0) && (
        <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(147,199,230,0.12)", border: "1px solid rgba(147,199,230,0.45)" }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "#93c7e6" }}>Active effects on your Auras</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: "#dfeaf3" }}>
            {costReduction > 0 && <span>Auras cost <b>−{costReduction}</b> generic</span>}
            {drawPerAuraCast > 0 && <span>Draw <b>{drawPerAuraCast}</b> per Aura cast</span>}
          </div>
        </div>
      )}

      {/* in play */}
      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: HDR }}>In play ({boardCards.length})</div>
      <div className="grid gap-1.5 mb-3">
        {boardCards.map((x) => (
          <div key={x.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(232,184,75,0.12)", border: "1px solid #e8b84b" }}>
            <div className="min-w-0">
              <div className="font-bold text-[14px]" style={{ color: "#f0ead9" }}>{x.name}</div>
              <div className="text-[11px]" style={{ color: "#93c7e6" }}>
                {[x.flat ? `Auras cost {${x.flat}} less` : null,
                  x.affinity ? `Affinity for Auras (−${x.affinity * equippedIds.length} now)` : null,
                  x.drawPerAura ? "Draw on Aura cast" : null].filter(Boolean).join(" · ") || <span style={{ color: "#8b8778" }}>{x.typeLine}</span>}
              </div>
            </div>
            <button onClick={() => toggle(x.id)} className="rounded-lg px-2 py-1.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}><X size={15} style={{ color: "#cfc9ba" }} /></button>
          </div>
        ))}
        {boardCards.length === 0 && <div className="text-sm italic py-2 text-center" style={{ color: "#6f6a5d" }}>Nothing added yet.</div>}
      </div>

      {/* add from deck */}
      <div ref={boxRef} className="rounded-xl p-3 mb-3" style={{ background: "rgba(232,184,75,0.09)", border: "1.5px solid rgba(232,184,75,0.55)" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Plus size={14} style={{ color: "#e8b84b" }} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>Add a permanent you control</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(232,184,75,0.45)" }}>
          <Search size={18} style={{ color: "#e8b84b" }} />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setBrowse(true)} onClick={() => setBrowse(true)} placeholder="Type or tap to browse your deck…" className="bg-transparent outline-none text-base w-full" style={{ color: "#ece7db" }} />
          {q && <button onMouseDown={(e) => e.preventDefault()} onClick={() => setQ("")}><X size={16} style={{ color: "#8b8778" }} /></button>}
          {supportPool.length > 0 && <BrowseToggle open={listOpen} onToggle={() => { if (listOpen) { setBrowse(false); setQ(""); if (searchRef.current) searchRef.current.blur(); } else setBrowse(true); }} />}
        </div>
        {supportPool.length === 0 ? (
          <p className="text-[11px] mt-2" style={{ color: "#c98a8a" }}>No non-Aura cards stored yet — re-import your decklist on the Deck tab to pull them in.</p>
        ) : listOpen ? (
          <div className="grid gap-1.5 mt-2" style={!q ? { maxHeight: 340, overflowY: "auto", WebkitOverflowScrolling: "touch" } : undefined}>
            {!q && <div className="text-[10px] uppercase tracking-wide" style={{ color: "#8b8778" }}>Non-Aura cards in your deck ({matches.length})</div>}
            {matches.slice(0, q ? 40 : 100).map((x) => (
              <button key={x.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { toggle(x.id); setQ(""); if (searchRef.current) searchRef.current.focus(); }}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="min-w-0">
                  <span className="font-semibold text-[14px] block" style={{ color: "#e6dfce" }}>{x.name}</span>
                  {x.relevant && <span className="text-[10px]" style={{ color: "#93c7e6" }}>affects your Auras</span>}
                </span>
                <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 28, height: 28, background: "rgba(232,184,75,0.2)" }}><Plus size={16} style={{ color: "#e8b84b" }} /></span>
              </button>
            ))}
            {matches.length === 0 && <div className="text-sm italic py-2 text-center" style={{ color: "#6f6a5d" }}>{q ? "No match in your deck." : "Everything's already on the battlefield."}</div>}
          </div>
        ) : (
          <div className="text-[11px] mt-1.5" style={{ color: "#8b8778" }}>{supportPool.length} non-Aura cards from your deck. Cards that reduce Aura costs or draw on Aura casts feed the Cast tab automatically.</div>
        )}
      </div>
    </div>
  );
}

/* ====================== TAB · FETCH (Light-Paws trigger) ====================== */
function FetchTab({ onOpenWeights, deckAuras, equipped, hand, graveSet, equip, valueOfAdding, curPower, curTough, openInfo, weights, setWeights, mv, setMv, loopActive, onBackToCast, onAfterFetch, ctx, equippedIds, curDS, resetTurn }) {
  const [q, setQ] = useState("");
  const [kwFilters, setKwFilters] = useState(() => new Set());
  const cap = mv >= 5 ? 99 : mv;

  const inRange = deckAuras.filter((a) => !equipped.has(a.id) && !hand.has(a.id) && !graveSet.has(a.id) && a.cmc <= cap);
  // only offer filters for keywords that actually exist among fetchable auras at this cost
  const availableKw = KW_ORDER.filter((k) => inRange.some((a) => a.buff && a.canRide && a.kw.includes(k)));
  const toggleKw = (k) => setKwFilters((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  useEffect(() => { setKwFilters((s) => { const n = new Set([...s].filter((k) => availableKw.includes(k))); return n.size === s.size ? s : n; }); }, [mv]);

  const pool = inRange.filter((a) => auraMatchesText(a, q) && (!kwFilters.size || [...kwFilters].every((k) => a.kw.includes(k))));
  const buffs = pool.filter((a) => a.buff && a.canRide)
    .map((a) => ({ a, ev: valueOfAdding([a.id]) }))
    .sort((x, y) => y.ev.score - x.ev.score);

  return (
    <div className="px-3 pt-4">
      {loopActive && (
        <button onClick={onBackToCast} className="w-full text-sm font-bold rounded-lg py-2.5 mb-3 flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
          ← Back to casting your best play
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: HDR }}>Fetch · trigger tutor</div>
        <button onClick={resetTurn} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0" style={BTN_2}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <BoardPeek {...{ curPower, curTough, curDS, ctx, equippedIds, deckAuras, byName }} />
      <p className="text-xs mb-3" style={{ color: "#8b8778" }}>
        Cast an Aura, then tap its mana value. Light-Paws fetches any Aura of that value <b>or less</b> whose name you don't already control — ranked best-first for your board (Light-Paws is {curPower}/{curTough}).
      </p>

      <AuraFilterBar mvLabel="Mana value of the Aura you cast (fetches that or less)" mvSelected={new Set([mv])} onMv={setMv} q={q} setQ={setQ}
        kwAvail={availableKw} kwSel={kwFilters} toggleKw={toggleKw} onClear={() => { setKwFilters(new Set()); setQ(""); }} />

      <div className="text-xs mb-2" style={{ color: "#8b8778" }}>
        {buffs.length} fetchable · mana value ≤ {mv >= 5 ? "any" : mv} · tap Add · hold for the full card
      </div>
      <div className="grid gap-1.5 mb-4">
        {buffs.map(({ a, ev }, i) => (
          <FetchRow key={a.id} a={a} ev={ev} first={i === 0} onEquip={() => { equip(a.id); onAfterFetch && onAfterFetch(); }} onInfo={() => openInfo(a)} />
        ))}
        {buffs.length === 0 && <div className="text-sm italic py-3 text-center" style={{ color: "#6f6a5d" }}>{q ? "No fetchable auras match that." : "No fetchable equip auras left at this cost."}</div>}
      </div>

      <p className="text-[11px] mb-6" style={{ color: "#6f6a5d" }}>
        Removal auras (Pacifism, Arrest, Reprobation…) aren't shown here — Light-Paws can only attach a fetch to itself, so those are cards you cast from hand on the Cast tab.
      </p>

      <button onClick={onOpenWeights} className="text-xs flex items-center gap-1 mb-4" style={{ color: "#8b8778" }}>
        <Settings size={13} /> Adjust scoring weights
      </button>
    </div>
  );
}

function ProtectionTracker({ protAuras, protChoice, setProt }) {
  if (!protAuras.length) return null;
  const items = protAuras.map((a) => a.prot === "creatures" ? "Creatures" : (protChoice[a.id] ? colorLabel(protChoice[a.id]) : null)).filter(Boolean);
  const needsPick = protAuras.some((a) => a.prot === "choice" && !protChoice[a.id]);
  return (
    <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "rgba(93,166,214,0.10)", border: "1px solid rgba(147,199,230,0.3)" }}>
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <ShieldHalf size={13} style={{ color: "#93c7e6" }} />
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#93c7e6" }}>Protected from</span>
        <span className="text-sm font-bold" style={{ color: "#dfeaf3" }}>{items.length ? items.join(", ") : (needsPick ? "pick a color ↓" : "—")}</span>
      </div>
      {protAuras.map((a) => (
        <div key={a.id} className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[11px]" style={{ color: "#9a9484" }}>{a.name}:</span>
          {a.prot === "creatures" ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)", color: "#cfc9ba" }}>Creatures</span>
          ) : (
            <div className="flex items-center gap-1">
              {COLORS.map((c) => {
                const on = protChoice[a.id] === c.key;
                const dim = protChoice[a.id] && !on;
                return (
                  <button key={c.key} onClick={() => setProt(a.id, on ? null : c.key)} title={c.label}
                    className="rounded-full flex items-center justify-center"
                    style={{ width: 24, height: 24, background: c.hex, border: on ? "2px solid #e8b84b" : "1px solid rgba(0,0,0,0.35)", boxShadow: on ? "0 0 8px rgba(232,184,75,0.7)" : "none", opacity: dim ? 0.4 : 1 }}>
                    <span className="text-[11px] font-black" style={{ color: c.fg }}>{c.label[0]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AdBanner() {
  useEffect(() => {
    if (AD_CLIENT) { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {} }
  }, []);
  if (!AD_CLIENT) return null;   // nothing renders until AD_CLIENT is set
  return (
    <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={AD_CLIENT} data-ad-slot={AD_SLOT} data-ad-format="horizontal" data-full-width-responsive="true" />
  );
}

function TourOverlay({ step, total, data, target, onNext, onBack, onSkip }) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    const measure = () => { if (target) { const r = target.getBoundingClientRect(); setRect({ x: r.left, y: r.top, w: r.width, h: r.height }); } };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 60);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, [target, step]);
  const last = step === total - 1;
  const pad = 4;
  const navTop = rect ? rect.y : (typeof window !== "undefined" ? window.innerHeight - 64 : 600);
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Tour step ${step + 1} of ${total}`}>
      {/* click-blocker; the spotlight's huge shadow does the dimming */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} style={{ background: rect ? "transparent" : "rgba(0,0,0,0.72)" }} />
      {rect && (
        <div className="absolute rounded-xl pointer-events-none" style={{
          left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px #e8b84b, 0 0 18px rgba(232,184,75,0.7)",
          transition: "all 220ms ease",
        }} />
      )}
      <div className="absolute inset-x-0 px-3" style={{ bottom: (typeof window !== "undefined" ? window.innerHeight : 700) - navTop + 14 }}>
        <div className="max-w-lg mx-auto rounded-2xl p-4" style={{ background: "#1a1e2b", border: "1.5px solid rgba(232,184,75,0.6)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>{step + 1} of {total}</span>
            <button onClick={onSkip} className="text-[12px] font-semibold" style={{ color: "#8b8778" }}>Skip tour</button>
          </div>
          <div className="text-base font-bold mb-1" style={{ color: "#f0ead9" }}>{data.title}</div>
          <p className="text-sm leading-snug" style={{ color: "#cfc9ba" }}>{data.body}</p>
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className="h-1.5 rounded-full" style={{ width: i === step ? 18 : 6, background: i <= step ? "#e8b84b" : "rgba(255,255,255,0.18)", transition: "all 200ms" }} />
            ))}
            <div className="flex-1" />
            {step > 0 && <button onClick={onBack} className="text-sm font-semibold rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.08)", color: "#cfc9ba" }}>Back</button>}
            <button onClick={onNext} className="text-sm font-bold rounded-lg px-4 py-2" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
              {last ? "Import my deck" : "Next"}
            </button>
          </div>
        </div>
      </div>
      {/* pointer to the highlighted tab */}
      {rect && <div className="absolute pointer-events-none" style={{ left: rect.x + rect.w / 2 - 8, top: rect.y - 16, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "9px solid rgba(232,184,75,0.9)" }} />}
    </div>
  );
}

function AppHeader({ onSettings }) {
  return (
    <div className="safe-top">
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="text-[13px] font-bold" style={{ color: "#cfc9ba" }}>Light-Paws Companion</div>
        <button onClick={onSettings} aria-label="Settings" className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Settings size={18} style={{ color: "#cfc9ba" }} />
        </button>
      </div>
    </div>
  );
}

/* ---- backup / restore (everything the app saves lives under the "lp_" localStorage prefix) ---- */
const BACKUP_APP = "light-paws-companion";
function lpKeys() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("lp_")) out.push(k); } } catch {}
  return out;
}
function collectBackup() {
  const data = {};
  lpKeys().forEach((k) => { data[k] = localStorage.getItem(k); });
  return { app: BACKUP_APP, version: 1, exported: new Date().toISOString(), data };
}
function parseBackup(text) {
  let b;
  try { b = JSON.parse(text); } catch { throw new Error("That file isn't a Light-Paws backup (it isn't valid JSON)."); }
  if (!b || b.app !== BACKUP_APP || !b.data || typeof b.data !== "object") throw new Error("That file isn't a Light-Paws backup.");
  const keys = Object.keys(b.data).filter((k) => k.startsWith("lp_") && typeof b.data[k] === "string");
  if (!keys.length) throw new Error("That backup is empty.");
  return { ...b, keys };
}
function applyBackup(b) {
  lpKeys().forEach((k) => localStorage.removeItem(k));
  b.keys.forEach((k) => localStorage.setItem(k, b.data[k]));
}
function clearAllData() { lpKeys().forEach((k) => localStorage.removeItem(k)); }

function SettingsSection({ title, icon: Ico, open, onToggle, children }) {
  return (
    <div className="rounded-xl mb-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-3 text-left">
        <Ico size={16} style={{ color: "#e8b84b" }} />
        <span className="flex-1 text-sm font-bold" style={{ color: "#f0ead9" }}>{title}</span>
        {open ? <ChevronDown size={16} style={{ color: "#8b8778" }} /> : <ChevronRight size={16} style={{ color: "#8b8778" }} />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function SettingRow({ icon: Ico, label, sub, onClick, href, danger }) {
  const inner = (
    <>
      <Ico size={16} className="flex-shrink-0" style={{ color: danger ? "#e6939a" : "#cfc9ba" }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: danger ? "#e6939a" : "#ece7db" }}>{label}</span>
        {sub && <span className="block text-[11px] leading-snug" style={{ color: "#8b8778" }}>{sub}</span>}
      </span>
    </>
  );
  const cls = "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left";
  const st = { background: "rgba(255,255,255,0.04)" };
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls} style={st}>{inner}</a>
    : <button onClick={onClick} className={cls} style={st}>{inner}</button>;
}

function SettingsSheet({ initialSection, onClose, weights, setWeights, onTour }) {
  const [open, setOpen] = useState(() => new Set(initialSection ? [initialSection] : ["help"]));
  const toggle = (k) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [stats, setStats] = useState(analyticsOn());
  const [msg, setMsg] = useState(null);            // { ok, text }
  const fileRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, []);

  const backupName = () => `light-paws-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const saveBackup = async () => {
    const text = JSON.stringify(collectBackup());
    track("backup/save");
    try {
      const file = new File([text], backupName(), { type: "application/json" });
      const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Light-Paws backup" });
        setMsg({ ok: true, text: "Backup ready. Keep the file somewhere you can reach from your other device." });
        return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = backupName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: `Saved ${backupName()} to your downloads.` });
  };
  const copyBackup = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(collectBackup())); track("backup/copy"); setMsg({ ok: true, text: "Backup copied. Paste it into a note or email to yourself." }); }
    catch { setMsg({ ok: false, text: "Couldn't copy on this browser. Use Save backup file instead." }); }
  };
  const restore = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const b = parseBackup(await f.text());
      const when = b.exported ? new Date(b.exported).toLocaleDateString() : "an earlier date";
      if (!confirm(`Replace everything on this device with the backup from ${when}? Your current decks and game state will be overwritten.`)) return;
      applyBackup(b); track("backup/restore");
      location.reload();
    } catch (err) { setMsg({ ok: false, text: err.message || "Couldn't read that backup." }); }
  };
  const wipe = () => {
    if (!confirm("Delete all your decks, printings, weights and game state on this device? Save a backup first if you might want them back.")) return;
    clearAllData(); track("data/clear");
    location.reload();
  };
  const toggleStats = () => {
    const on = !stats; setStats(on); setAnalyticsOn(on);
    if (on) loadAnalytics();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" role="dialog" aria-modal="true" aria-label="Settings" style={{ ...SANS, background: "#12151f", color: "#ece7db" }}>
      <div className="safe-top" style={{ borderBottom: "1px solid rgba(232,184,75,0.25)", background: "#161a26" }}>
        <div className="max-w-lg mx-auto px-3 py-3 flex items-center justify-between">
          <div className="font-bold text-lg" style={{ color: "#f0ead9" }}>Settings</div>
          <button onClick={onClose} aria-label="Close settings" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}><X size={18} style={{ color: "#cfc9ba" }} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-3 pt-3 pb-10">

          <SettingsSection title="Help & feedback" icon={HelpCircle} open={open.has("help")} onToggle={() => toggle("help")}>
            <div className="grid gap-1.5">
              <SettingRow icon={HelpCircle} label="How it works" sub="Replay the quick tour of each tab" onClick={onTour} />
              <p className="text-[11px] leading-snug px-1 pt-1" style={{ color: "#8b8778" }}>Tip: gold-filled buttons and outlined chips are things you can tap. Plain text is just information.</p>
              {FEEDBACK_URL && <SettingRow icon={MessageSquare} label="Send feedback" sub="Report a bug or suggest a feature" href={FEEDBACK_URL} onClick={() => track("click/feedback")} />}
              {DONATE_URL && <SettingRow icon={Heart} label="Support this app" sub="It's free. Tips help cover the domain and hosting." href={DONATE_URL} onClick={() => track("click/support")} />}
            </div>
          </SettingsSection>

          <SettingsSection title="Scoring weights" icon={BarChart3} open={open.has("weights")} onToggle={() => toggle("weights")}>
            <WeightsEditor weights={weights} setWeights={setWeights} />
          </SettingsSection>

          <SettingsSection title="Your data" icon={Database} open={open.has("data")} onToggle={() => toggle("data")}>
            <p className="text-[11px] mb-2 leading-snug" style={{ color: "#8b8778" }}>Everything is saved on this device only. Use a backup to move your decks to another phone or browser.</p>
            <div className="grid gap-1.5">
              <SettingRow icon={Download} label="Save backup file" sub="Decks, printings, weights and game state" onClick={saveBackup} />
              <SettingRow icon={Copy} label="Copy backup as text" onClick={copyBackup} />
              <SettingRow icon={FileUp} label="Restore from backup" sub="Replaces what's on this device" onClick={() => fileRef.current && fileRef.current.click()} />
              <SettingRow icon={Trash2} label="Clear all data" sub="Start fresh on this device" onClick={wipe} danger />
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json,.txt" onChange={restore} className="hidden" />
            {msg && <div role="status" className="text-[11px] mt-2 leading-snug" style={{ color: msg.ok ? "#8fd39a" : "#e6939a" }}>{msg.text}</div>}
          </SettingsSection>

          <SettingsSection title="Privacy" icon={Eye} open={open.has("privacy")} onToggle={() => toggle("privacy")}>
            <button onClick={toggleStats} role="switch" aria-checked={stats} className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left" style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="flex-1">
                <span className="block text-sm font-semibold" style={{ color: "#ece7db" }}>Share anonymous usage stats</span>
                <span className="block text-[11px] leading-snug" style={{ color: "#8b8778" }}>Counts visits and which tabs get used. No cookies, no personal data.</span>
              </span>
              <span className="relative flex-shrink-0 rounded-full" style={{ width: 42, height: 24, background: stats ? "#c1902f" : "rgba(255,255,255,0.15)", transition: "background 150ms" }}>
                <span className="absolute rounded-full" style={{ top: 3, left: stats ? 21 : 3, width: 18, height: 18, background: stats ? "#221a09" : "#8b8778", transition: "left 150ms" }} />
              </span>
            </button>
          </SettingsSection>

          <SettingsSection title="About" icon={Info} open={open.has("about")} onToggle={() => toggle("about")}>
            <div className="text-[12px] leading-relaxed" style={{ color: "#b7b1a2" }}>
              <p className="mb-2">Light-Paws Companion, version {APP_VERSION}. Made by John Kline for the Light-Paws, Emperor's Voice Commander deck. <a href={SITE_URL} className="underline" style={{ color: "#e8b84b" }}>lightpaws.app</a></p>
              <p className="mb-2">Card data and images courtesy of Scryfall.</p>
              {AFFILIATE_TCGPLAYER && <p className="mb-2">Affiliate disclosure: Light-Paws Companion is a TCGplayer affiliate. "Buy" buttons are affiliate links, so if you buy through them the app earns a small commission at no extra cost to you. It helps keep the app free.</p>}
              <p className="text-[11px]" style={{ color: "#8b8778" }}>Light-Paws Companion is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</p>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function TabFooter() {
  return (
    <div className="px-3 pt-3 pb-6">
      <AdBanner />
      {DONATE_URL && (
        <div className={"flex justify-center" + (AD_CLIENT ? " mt-3" : "")}>
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("click/support")}
            className="inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-4 py-2"
            style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
            <Heart size={14} /> Support this app
          </a>
        </div>
      )}
      <p className="text-[10px] leading-snug text-center mt-4" style={{ color: "#5f5a4e" }}>
        Unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.
        Card data &amp; images courtesy of Scryfall. Help, feedback and more in Settings (gear, top right).
      </p>
    </div>
  );
}

function FoxEmblem() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="#12131b" />
      <path d="M28 30 L40 52 L28 58 Z M72 30 L60 52 L72 58 Z" fill="#e8b84b" opacity="0.85" />
      <path d="M50 40 C34 40 30 56 30 64 C30 78 40 86 50 86 C60 86 70 78 70 64 C70 56 66 40 50 40 Z" fill="#f2ead6" />
      <circle cx="42" cy="62" r="3.4" fill="#221a09" />
      <circle cx="58" cy="62" r="3.4" fill="#221a09" />
      <path d="M50 70 l-4 5 h8 z" fill="#221a09" />
    </svg>
  );
}
