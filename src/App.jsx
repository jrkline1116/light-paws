import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Feather, Sword, Swords, Eye, EyeOff, Heart, ShieldCheck, ShieldHalf, Gem, Umbrella,
  Sparkles, Search, Upload, Layers, Database, Plus, Minus, X, Star, RotateCcw, Check, Lock, Filter, Wand2,
} from "lucide-react";

/* ============================================================
   CONFIG — fill these in, then rebuild. Leave "" to hide.
   ============================================================ */
const DONATE_URL = "https://buymeacoffee.com/jrkline1116";   // e.g. "https://ko-fi.com/yourname"
const AD_CLIENT  = "";   // AdSense publisher id, e.g. "ca-pub-0000000000000000"
const AD_SLOT    = "";   // AdSense ad-unit slot id, e.g. "1234567890"

/* ============================================================
   LIGHT-PAWS COMPANION
   Tabs: Board · Play · Deck · All Auras
   ============================================================ */

// ---- scoring constants ----
const P_VAL = 1.0, T_VAL = 0.5, DRAW_VAL = 2, TOKEN_NOW = 1.5, TOKEN_COND = 0.75, ETB_REMOVAL = 3;
const CONNECT_EVASIVE = 0.85, CONNECT_GROUND = 0.45;

// ---- keyword metadata (order = ring order, starting top, clockwise) ----
const KW = {
  flying:        { label: "Flying",        w: 2, Icon: Feather },
  doubleStrike:  { label: "Double strike", w: 4, Icon: Swords },
  firstStrike:   { label: "First strike",  w: 2, Icon: Sword },
  vigilance:     { label: "Vigilance",     w: 2, Icon: Eye },
  lifelink:      { label: "Lifelink",      w: 3, Icon: Heart },
  protection:    { label: "Protection",    w: 3, Icon: ShieldHalf },
  hexproof:      { label: "Hexproof",      w: 4, Icon: EyeOff },
  indestructible:{ label: "Indestructible",w: 4, Icon: Gem },
  ward:          { label: "Ward",          w: 2, Icon: ShieldCheck },
  totemArmor:    { label: "Totem armor",   w: 3, Icon: Umbrella },
};
const KW_ORDER = Object.keys(KW);

const COLORS = [
  { key: "white", label: "White", hex: "#f3ead0", fg: "#6b5212" },
  { key: "blue",  label: "Blue",  hex: "#3b7fc4", fg: "#ffffff" },
  { key: "black", label: "Black", hex: "#4b4b52", fg: "#ffffff" },
  { key: "red",   label: "Red",   hex: "#c8443b", fg: "#ffffff" },
  { key: "green", label: "Green", hex: "#3d8a52", fg: "#ffffff" },
];
const colorLabel = (k) => { const c = COLORS.find((x) => x.key === k); return c ? c.label : k; };

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
});

const LIBRARY = [
  // ---- the 33 in the current deck (deck:true) ----
  A("cartouche","Cartouche of Solidarity",0,1,{deck:1,kw:["firstStrike"],stat:{p:1,t:1},token:"now",note:"ETB: 1/1 Warrior"}),
  A("ethereal","Ethereal Armor",0,1,{deck:1,kw:["firstStrike"],scale:"ethereal",note:"+1/+1 per enchantment you control"}),
  A("hyena","Hyena Umbra",0,1,{deck:1,kw:["firstStrike","totemArmor"],stat:{p:1,t:1}}),
  A("raffine","Raffine's Guidance",0,1,{deck:1,stat:{p:1,t:1},note:"Recast from GY 2W"}),
  A("sentinel","Sentinel's Eyes",0,1,{deck:1,kw:["vigilance"],stat:{p:1,t:1},note:"Escape"}),
  A("shardmage","Shardmage's Rescue",0,1,{deck:1,kw:["hexproof"],stat:{p:1,t:1},flash:1,note:"Hexproof only the turn it enters"}),
  A("glitters","All That Glitters",1,1,{deck:1,scale:"atg",note:"+1/+1 per artifact + enchantment"}),
  A("angelic","Angelic Gift",1,1,{deck:1,kw:["flying"],draw:1}),
  A("benevolent","Benevolent Blessing",1,1,{deck:1,kw:["protection"],prot:"choice",flash:1,note:"Protection: chosen color"}),
  A("dogumbra","Dog Umbra",1,1,{deck:1,kw:["totemArmor"],flash:1,note:"On an opponent: it can't attack/block"}),
  A("feather","Feather of Flight",1,1,{deck:1,kw:["flying"],stat:{p:1,t:0},draw:1,flash:1}),
  A("gryff","Gryff's Boon",1,1,{deck:1,kw:["flying"],note:"Recast from GY 3W"}),
  A("indomitable","Indomitable Will",1,1,{deck:1,stat:{p:1,t:2},flash:1}),
  A("serra","On Serra's Wings",3,1,{deck:1,kw:["flying","vigilance","lifelink"],stat:{p:1,t:1}}),
  A("pentarch","Pentarch Ward",1,1,{deck:1,kw:["protection"],prot:"choice",draw:1,note:"Protection: chosen color"}),
  A("rune","Rune of Sustenance",1,1,{deck:1,kw:["lifelink"],draw:1}),
  A("spectral","Spectral Steel",1,1,{deck:1,stat:{p:2,t:2},note:"1W, exile from GY: return an Aura/Equipment to hand"}),
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
];

const byId = Object.fromEntries(LIBRARY.map((a) => [a.id, a]));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

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
  if (/umbra armor/.test(lo)) kw.add("totemArmor");
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
    else scaleNote = "Scaling on " + scaleM[3].trim() + " — not auto-scored; use Extra P/T on Active";
  }
  const stat = scale ? null : (scaleM ? null : parseFixedStat(o));
  const isRemoval = /can't attack|can't block|loses all abilities|can't be activated/.test(lo);
  const grantsGood = kw.size > 0 || (stat && (stat.p > 0 || stat.t > 0)) || !!scale;
  const buff = !!grantsGood && !isRemoval && canRide;
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
      flash: /\bflash\b/.test(lo), deck: false, imported: true,
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

/* ======================================================================== */

export default function LightPawsConsole() {
  const [tab, setTab] = useState(0);
  const [deck, setDeck] = useState(() => new Set(LS.get("deck", DEFAULT_DECK)));
  const [equipped, setEquipped] = useState(() => new Set(LS.get("equipped", [])));
  const [manualKw, setManualKw] = useState(() => new Set(LS.get("manual", [])));
  const [white, setWhite] = useState(() => LS.get("white", 2));
  const [other, setOther] = useState(() => LS.get("other", 0));
  const [baseP, setBaseP] = useState(() => LS.get("baseP", 2));
  const [baseT, setBaseT] = useState(() => LS.get("baseT", 2));
  const [manualP, setManualP] = useState(() => LS.get("manualP", 0));
  const [manualT, setManualT] = useState(() => LS.get("manualT", 0));
  useEffect(() => { LS.set("manualP", manualP); }, [manualP]);
  useEffect(() => { LS.set("manualT", manualT); }, [manualT]);
  const [plains, setPlains] = useState(() => LS.get("plains", 6));
  const [artifacts, setArtifacts] = useState(() => LS.get("artifacts", 1));
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
  const choosePrint = (name, pr) => setChosenPrints((p) => ({ ...p, [name]: pr }));

  // save on change
  useEffect(() => { LS.set("deck", [...deck]); }, [deck]);
  useEffect(() => { LS.set("equipped", [...equipped]); }, [equipped]);
  useEffect(() => { LS.set("manual", [...manualKw]); }, [manualKw]);
  useEffect(() => { LS.set("white", white); }, [white]);
  useEffect(() => { LS.set("other", other); }, [other]);
  useEffect(() => { LS.set("baseP", baseP); }, [baseP]);
  useEffect(() => { LS.set("baseT", baseT); }, [baseT]);
  useEffect(() => { LS.set("plains", plains); }, [plains]);
  useEffect(() => { LS.set("artifacts", artifacts); }, [artifacts]);
  useEffect(() => { LS.set("otherEnch", otherEnch); }, [otherEnch]);

  const [enriched, setEnriched] = useState(() => LS.get("enriched", null));
  const [imported, setImported] = useState(() => LS.get("imported", []));
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
  const LIB = useMemo(() => [...baseLib, ...imported], [baseLib, imported]);
  const nameToId = useMemo(() => Object.fromEntries(LIB.map((a) => [norm(a.name), a.id])), [LIB]);

  // Import a decklist: match to library, and enrich anything unknown from Scryfall.
  async function importList(text) {
    setImporting(true);
    try {
      const names = [];
      text.split("\n").forEach((raw) => {
        let line = raw.trim();
        if (!line) return;
        if (/^(deck|commander|sideboard|maybeboard|about)\b/i.test(line)) return;
        line = line.replace(/^\d+\s*x?\s+/i, "").replace(/\s*\([^)]*\)\s*[\w-]*\s*$/, "").replace(/\s+\*[^*]*\*\s*$/, "").replace(/\s+#.*$/, "").trim();
        if (line && norm(line) !== norm("Light-Paws, Emperor's Voice")) names.push(line);
      });
      const uniq = [...new Map(names.map((n) => [norm(n), n])).values()];
      const toAdd = new Set(); const unknown = [];
      uniq.forEach((n) => { const id = nameToId[norm(n)]; if (id) toAdd.add(id); else unknown.push(n); });

      const derived = []; const rejected = [];
      for (let i = 0; i < unknown.length; i += 75) {
        const chunk = unknown.slice(i, i + 75);
        try {
          const r = await fetch("https://api.scryfall.com/cards/collection", {
            method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ identifiers: chunk.map((n) => ({ name: n })) }),
          });
          if (!r.ok) { rejected.push(...chunk); continue; }
          const d = await r.json();
          (d.data || []).forEach((c) => { const res = deriveAura(c); if (res.ok) derived.push(res.aura); else rejected.push(res.name + " (" + res.reason + ")"); });
          (d.not_found || []).forEach((nf) => rejected.push((nf.name || "unknown") + " (not found)"));
        } catch { rejected.push(...chunk); }
      }
      if (derived.length) {
        setImported((prev) => {
          const have = new Set(prev.map((a) => a.id));
          const merged = [...prev, ...derived.filter((a) => !have.has(a.id))];
          LS.set("imported", merged); return merged;
        });
      }
      const allIds = new Set(toAdd); derived.forEach((a) => allIds.add(a.id));
      setDeck((prev) => new Set([...prev, ...allIds]));
      return { matched: toAdd.size, enriched: derived.length, rejected };
    } finally { setImporting(false); }
  }

  const deckAuras = useMemo(() => LIB.filter((a) => deck.has(a.id)), [LIB, deck]);
  const deckNames = useMemo(() => new Set(deckAuras.map((a) => a.name)), [deckAuras]);
  const equippedIds = useMemo(() => [...equipped].filter((id) => deck.has(id)), [equipped, deck]);

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

  const curPower = baseP + manualP + ctx.addP;
  const curTough = baseT + manualT + ctx.addT;
  const curDS = ctx.have.has("doubleStrike");
  const projDmg = Math.round(curPower * (ctx.evasive ? CONNECT_EVASIVE : CONNECT_GROUND) * (curDS ? 2 : 1));

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
    const statScore = addP * P_VAL + addT * T_VAL;

    const otherPresent = resulting >= 2 || ctx.on.length >= 1;
    const added = new Set();
    set.forEach((a) => activeKw(a, otherPresent).forEach((k) => added.add(k)));
    const finalHave = new Set(before); added.forEach((k) => finalHave.add(k));

    const evasive = finalHave.has("flying") || [...ctx.on, ...set].some((a) => a.evasion);
    const connect = evasive ? CONNECT_EVASIVE : CONNECT_GROUND;
    const projPower = baseP + manualP + ctx.addP + addP;

    let kwScore = 0; const gainedKw = [];
    KW_ORDER.forEach((k) => {
      if (k === "protection") return;
      if (!(finalHave.has(k) && !hasKw(before, k))) return;
      if (k === "firstStrike" && finalHave.has("doubleStrike")) return;
      if (k === "totemArmor" && finalHave.has("indestructible")) return;
      if (k === "doubleStrike") { const v = projPower * connect; kwScore += v; gainedKw.push(`Double strike (~${v.toFixed(1)})`); return; }
      kwScore += KW[k].w; gainedKw.push(KW[k].label);
    });
    const prot = set.filter((a) => a.kw.includes("protection")).length;
    if (prot > 0) { kwScore += prot * KW.protection.w; gainedKw.push(prot > 1 ? `Protection ×${prot}` : "Protection"); }

    let effScore = 0, draws = 0;
    set.forEach((a) => {
      if (a.draw === "sage") draws += counts.auras; else if (a.draw) draws += a.draw;
      if (a.token === "now") effScore += TOKEN_NOW;
      if (a.token === "cond") effScore += TOKEN_COND;
      if (a.etbRemoval) effScore += ETB_REMOVAL;
    });
    effScore += draws * DRAW_VAL;

    return { score: kwScore + statScore + effScore, gainedKw, addP, addT, draws,
      manaW: set.reduce((s, a) => s + a.cost.w, 0), manaTotal: set.reduce((s, a) => s + a.cmc, 0) };
  }

  const auraInfo = useMemo(() => {
    const m = {};
    deckAuras.forEach((a) => {
      const onBoard = equipped.has(a.id);
      const affordable = white >= a.cost.w && (white + other) >= a.cmc;
      let marginal = 0, redundant = false;
      if (a.buff && !onBoard) { marginal = valueOfAdding([a.id]).score; redundant = marginal < 0.5; }
      m[a.id] = { onBoard, affordable, marginal, redundant };
    });
    return m;
  }, [deckAuras, equipped, white, other, plains, artifacts, otherEnch, manualKw, baseP, baseT]);

  const best = useMemo(() => {
    const total = white + other;
    const cands = deckAuras.filter((a) => a.buff && !equipped.has(a.id) && a.canRide)
      .map((a) => ({ a, s: valueOfAdding([a.id]).score })).sort((x, y) => y.s - x.s);
    let bestSet = [], bestScore = 0, bestEval = valueOfAdding([]); let nodes = 0;
    (function dfs(i, chosen, wU, tU) {
      if (nodes++ > 300000) return;
      const ev = valueOfAdding(chosen);
      if (ev.score > bestScore + 1e-9) { bestScore = ev.score; bestSet = [...chosen]; bestEval = ev; }
      for (let j = i; j < cands.length; j++) {
        const a = cands[j].a, nw = wU + a.cost.w, nt = tU + a.cmc;
        if (nw <= white && nt <= total) dfs(j + 1, [...chosen, a.id], nw, nt);
      }
    })(0, [], 0, 0);
    const single = cands.filter(({ a }) => white >= a.cost.w && total >= a.cmc)[0];
    return { ids: bestSet, eval: bestEval, single: single ? single.a : null };
  }, [deckAuras, equipped, white, other, plains, artifacts, otherEnch, manualKw, baseP, baseT]);

  // ---- actions ----
  const equip = (id) => setEquipped((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleManual = (k) => setManualKw((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const resetTurn = () => { setEquipped(new Set()); setManualKw(new Set()); setProtChoice({}); setManualP(0); setManualT(0); };

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

  const TABS = [
    { icon: Star, label: "Active" },
    { icon: Sparkles, label: "Cast" },
    { icon: Wand2, label: "Fetch" },
    { icon: Layers, label: "Deck" },
    { icon: Database, label: "Browse" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ ...SANS, background: "radial-gradient(1200px 600px at 50% -10%, #26314d 0%, #161a26 55%, #0f1118 100%)", color: "#ece7db" }}>
      <div className="max-w-lg mx-auto pb-24" onTouchStart={onTS} onTouchEnd={onTE}>

        {tab === 0 && (
          <BoardTab {...{ heroImg, heroArtist, ctx, manualKw, toggleManual, curPower, curTough, projDmg, curDS, deckAuras, equipped, equip, equippedIds, resetTurn, white, setWhite, other, setOther, openInfo, protChoice, setProt, manualP, setManualP, manualT, setManualT }} />
        )}
        {tab === 1 && (
          <PlayTab {...{ white, setWhite, other, setOther, baseP, setBaseP, baseT, setBaseT, plains, setPlains, artifacts, setArtifacts, otherEnch, setOtherEnch, curPower, curTough, projDmg, curDS, ctx, best, deckAuras, auraInfo, equip, byName, openInfo }} />
        )}
        {tab === 2 && (
          <FetchTab {...{ deckAuras, equipped, equip, valueOfAdding, curPower, curTough, openInfo }} />
        )}
        {tab === 3 && (
          <DeckTab {...{ deck, setDeck, equipped, setEquipped, openInfo, synced: !!enriched, lib: LIB, onImport: importList, importing }} />
        )}
        {tab === 4 && (
          <AllAurasTab onPick={setPickCard} chosenPrints={chosenPrints} deckNames={deckNames} />
        )}

        <TabFooter />
      </div>

      {/* bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-amber-900/40 backdrop-blur safe-bottom" style={{ background: "rgba(15,17,24,0.9)" }}>
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {TABS.map((t, i) => {
            const Ico = t.icon; const active = tab === i;
            return (
              <button key={i} onClick={() => setTab(i)} className="flex flex-col items-center gap-0.5 py-2.5 transition"
                style={{ color: active ? "#e8b84b" : "#8b8778" }}>
                <Ico size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
                {active && <span className="w-6 h-0.5 rounded-full mt-0.5" style={{ background: "#e8b84b" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {infoCard && <CardInfoModal aura={infoCard} chosenPrint={chosenPrints[infoCard.name]} onClose={() => setInfoCard(null)} />}
      {pickCard && <PrintingPicker card={pickCard} chosen={chosenPrints[pickCard.name]} onPick={(pr) => { choosePrint(pickCard.name, pr); setPickCard(null); }} onClose={() => setPickCard(null)} />}
    </div>
  );
}

function byName(id) { return byId[id] ? byId[id].name : id; }

/* ====================== TAB 1 · BOARD ====================== */
function BoardTab({ heroImg, heroArtist, ctx, manualKw, toggleManual, curPower, curTough, projDmg, curDS, deckAuras, equipped, equip, equippedIds, resetTurn, white, setWhite, other, setOther, openInfo, protChoice, setProt, manualP, setManualP, manualT, setManualT }) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(() => new Set());
  const [cmc, setCmc] = useState(() => new Set());
  const toggleFilter = (k) => setFilters((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleCmc = (b) => setCmc((s) => { const n = new Set(s); n.has(b) ? n.delete(b) : n.add(b); return n; });
  const matchCmc = (a) => (!cmc.size ? true : [...cmc].some((b) => (b === "5+" ? a.cmc >= 5 : a.cmc === b)));

  const results = useMemo(() => {
    const t = norm(q);
    return deckAuras.filter((a) => {
      if (equipped.has(a.id)) return false;
      if (t && !norm(a.name).includes(t)) return false;
      if (filters.size && ![...filters].some((f) => a.kw.includes(f))) return false;
      if (!matchCmc(a)) return false;
      return true;
    }).sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
  }, [q, filters, cmc, deckAuras, equipped]);

  const total = white + other;
  const R = 41; // ring radius (% of the square-ish stage)
  return (
    <div>
      {/* TOP: portrait + rune ring */}
      <div className="relative px-3 pt-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "#c79a3e" }}>Active · Light-Paws</div>
            <div className="text-sm" style={{ color: "#9a9484" }}>What's attached to your commander right now</div>
          </div>
          <button onClick={resetTurn} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "#cfc9ba" }}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <div className="relative mx-auto" style={{ height: 330, maxWidth: 380 }}>
          {/* halo */}
          <div className="absolute left-1/2 top-1/2" style={{ width: 200, height: 200, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,184,75,0.35), rgba(232,184,75,0) 70%)" }} />
          {/* portrait */}
          <div className="absolute left-1/2 top-1/2 overflow-hidden shadow-xl"
            style={{ width: 132, height: 132, transform: "translate(-50%,-50%)", borderRadius: "50%", border: "3px solid #e8b84b", background: "#0d0f16" }}>
            {heroImg ? (
              <img src={heroImg} alt="Light-Paws" className="w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} />
            ) : (
              <FoxEmblem />
            )}
          </div>
          {/* rune ring */}
          {KW_ORDER.map((k, i) => {
            const ang = (-90 + i * (360 / KW_ORDER.length)) * Math.PI / 180;
            const left = 50 + R * Math.cos(ang), top = 50 + R * Math.sin(ang);
            const on = hasKw(ctx.have, k);
            const Ico = KW[k].Icon;
            return (
              <button key={k} onClick={() => toggleManual(k)}
                className="absolute flex flex-col items-center justify-center transition-all"
                style={{
                  left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-50%)",
                  width: 58, height: 58, borderRadius: "50%",
                  border: on ? "2px solid #e8b84b" : "1.5px solid rgba(255,255,255,0.14)",
                  background: on ? "linear-gradient(160deg,#e8b84b,#b9852a)" : "rgba(255,255,255,0.04)",
                  color: on ? "#221a09" : "#8b8778",
                  boxShadow: on ? "0 0 16px rgba(232,184,75,0.6)" : "none",
                }}>
                <Ico size={19} strokeWidth={on ? 2.4 : 1.7} />
                <span className="text-[8px] font-bold leading-tight mt-0.5 text-center px-0.5">{KW[k].label}</span>
              </button>
            );
          })}
        </div>

        {/* P/T + damage */}
        <div className="text-center -mt-1">
          <div className="inline-flex items-baseline gap-2">
            <span className="text-5xl font-black" style={{ color: "#f4ecd8", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{curPower}</span>
            <span className="text-2xl font-bold" style={{ color: "#c79a3e" }}>/</span>
            <span className="text-5xl font-black" style={{ color: "#f4ecd8", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{curTough}</span>
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "#9a9484" }}>
            Projected combat dmg ≈ <b style={{ color: "#e8b84b" }}>{projDmg}</b>{curDS && " (double strike)"} · {ctx.evasive ? "evasive" : "likely blocked"}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-2" style={{ background: "rgba(232,184,75,0.14)", border: "1px solid rgba(232,184,75,0.4)" }}>
            <span className="text-sm font-black" style={{ color: "#e8b84b" }}>{equippedIds.length}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#c79a3e" }}>Auras attached</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#8b8778" }}>Extra P</span>
              <MiniStepSigned value={manualP} set={setManualP} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#8b8778" }}>Extra T</span>
              <MiniStepSigned value={manualT} set={setManualT} />
            </div>
          </div>
          <div className="text-[10px] mt-1" style={{ color: "#6f6a5d" }}>manual bonus for counters / untracked buffs</div>
        </div>

        {/* mana */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <ManaChip label="White" value={white} set={setWhite} gold />
          <ManaChip label="Other" value={other} set={setOther} />
          <div className="text-center px-1">
            <div className="text-[10px] uppercase" style={{ color: "#8b8778" }}>Total</div>
            <div className="text-lg font-bold leading-none" style={{ color: "#f0ead9" }}>{total}</div>
          </div>
        </div>
        {heroArtist && <div className="text-center text-[10px] mt-2" style={{ color: "#5f5a4e" }}>Art by {heroArtist} · © Wizards of the Coast</div>}
      </div>

      {/* divider */}
      <div className="h-px mx-3 my-3" style={{ background: "linear-gradient(90deg,transparent,rgba(232,184,75,0.5),transparent)" }} />

      {/* BOTTOM: equip search + running total */}
      <div className="px-3">
        {/* running total */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#c79a3e" }}>Equipped ({equippedIds.length})</span>
          {(ctx.addP > 0 || ctx.addT > 0) && <span className="text-xs font-bold" style={{ color: "#cfc9ba" }}>+{ctx.addP}/+{ctx.addT} from auras</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
          {equippedIds.length === 0 && <span className="text-sm italic" style={{ color: "#6f6a5d" }}>Nothing equipped yet — search below to add what you cast.</span>}
          {equippedIds.map((id) => (
            <button key={id} onClick={() => equip(id)} className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-1 text-sm font-semibold"
              style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
              {(deckAuras.find((a) => a.id === id) || {}).name || byName(id)} <X size={13} />
            </button>
          ))}
        </div>

        <ProtectionTracker protAuras={ctx.on.filter((a) => a.prot)} protChoice={protChoice} setProt={setProt} />

        {/* search */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Search size={16} style={{ color: "#8b8778" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search auras you cast this turn…"
            className="bg-transparent outline-none text-sm w-full" style={{ color: "#ece7db" }} />
          {q && <button onClick={() => setQ("")}><X size={15} style={{ color: "#8b8778" }} /></button>}
        </div>

        {/* hint */}
        <div className="text-[11px] mb-2" style={{ color: "#7d7869" }}>Tap to pick · confirm to add · hold for the full card</div>

        {/* keyword filters */}
        <NoSwipe className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <Filter size={13} style={{ color: "#8b8778", flexShrink: 0 }} />
          {KW_ORDER.map((k) => {
            const on = filters.has(k);
            return (
              <button key={k} onClick={() => toggleFilter(k)} className="text-[11px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap flex-shrink-0"
                style={{ background: on ? "#e8b84b" : "rgba(255,255,255,0.06)", color: on ? "#221a09" : "#a8a293", border: on ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
                {KW[k].label}
              </button>
            );
          })}
        </NoSwipe>

        {/* cost filters */}
        <NoSwipe className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "#8b8778" }}>Cost</span>
          {[1, 2, 3, 4, "5+"].map((b) => {
            const on = cmc.has(b);
            return (
              <button key={b} onClick={() => toggleCmc(b)} className="text-[11px] font-bold rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ minWidth: 30, height: 28, padding: "0 8px", background: on ? "#e8b84b" : "rgba(255,255,255,0.06)", color: on ? "#221a09" : "#a8a293", border: on ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
                {b}
              </button>
            );
          })}
        </NoSwipe>

        {/* results */}
        <div className="grid gap-1.5">
          {results.map((a) => (
            <EquipRow key={a.id} aura={a} ctx={ctx} onEquip={() => equip(a.id)} onInfo={() => openInfo(a)} />
          ))}
          {results.length === 0 && <div className="text-sm italic py-3 text-center" style={{ color: "#6f6a5d" }}>No matching auras in your deck.</div>}
        </div>
      </div>
    </div>
  );
}

/* ====================== TAB 2 · PLAY (optimizer) ====================== */
function PlayTab(p) {
  const { white, setWhite, other, setOther, baseP, setBaseP, baseT, setBaseT, plains, setPlains, artifacts, setArtifacts, otherEnch, setOtherEnch, curPower, curTough, projDmg, curDS, ctx, best, deckAuras, auraInfo, equip, openInfo } = p;
  const [showHelp, setShowHelp] = useState(false);
  const [showCounts, setShowCounts] = useState(false);
  const total = white + other;
  const buffs = deckAuras.filter((a) => a.buff);
  const removal = deckAuras.filter((a) => !a.buff);

  return (
    <div className="px-3 pt-4">
      <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "#c79a3e" }}>Cast · from hand</div>
      <p className="text-xs mb-2" style={{ color: "#8b8778" }}>Best auras to play from your hand for the mana you have.</p>

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

      {/* best play */}
      <div className="rounded-xl p-3 mb-3" style={{ background: "linear-gradient(160deg, rgba(232,184,75,0.14), rgba(232,184,75,0.05))", border: "1.5px solid #e8b84b" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Star size={15} style={{ color: "#e8b84b" }} fill="#e8b84b" />
          <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>Best play for {total} mana</span>
        </div>
        {best.ids.length === 0 ? (
          <p className="text-sm" style={{ color: "#b7b1a2" }}>No castable aura adds new value. {best.single && <>Cheapest useful cast: <b>{byName(best.single.id)}</b>.</>}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {best.ids.map((id) => (
                <button key={id} onClick={() => equip(id)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold" style={{ background: "#f0ead9", color: "#221a09" }}>
                  {byName(id)} <ManaCost aura={deckAuras.find((a) => a.id === id) || byId[id]} dark />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#cfc9ba" }}>
              <span>Uses <b>{best.eval.manaTotal}</b> ({best.eval.manaW}W)</span>
              <span>Score <b>{best.eval.score.toFixed(1)}</b></span>
              {best.eval.addP + best.eval.addT > 0 && <span>+{best.eval.addP}/+{best.eval.addT}</span>}
              {best.eval.gainedKw.length > 0 && <span>Gains: {best.eval.gainedKw.join(", ")}</span>}
            </div>
            <div className="text-[11px] mt-1" style={{ color: "#8b8778" }}>Tap a suggestion to equip it.</div>
          </>
        )}
      </div>

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
          <span className="text-xs" style={{ color: "#9a9484" }}>≈ <b style={{ color: "#e8b84b" }}>{projDmg}</b> dmg{curDS && " ×2"}</span>
        </div>
      </Card>

      {/* board counts */}
      <button onClick={() => setShowCounts((v) => !v)} className="text-xs uppercase tracking-wide flex items-center gap-1 py-1 mb-1" style={{ color: "#8b8778" }}>
        Board counts for scaling auras {showCounts ? "▲" : "▼"}
      </button>
      {showCounts && (
        <Card>
          <div className="flex gap-2">
            <Step label="Plains" value={plains} set={setPlains} />
            <Step label="Artifacts" value={artifacts} set={setArtifacts} />
            <Step label="Other ench." value={otherEnch} set={setOtherEnch} />
          </div>
        </Card>
      )}

      {/* aura list */}
      <div className="text-xs font-bold uppercase tracking-wide mb-2 mt-1" style={{ color: "#c79a3e" }}>Auras — tap to equip / unequip</div>
      <div className="grid gap-1.5 mb-4">
        {buffs.map((a) => <PlayRow key={a.id} aura={a} info={auraInfo[a.id]} ctx={ctx} rec={best.ids.includes(a.id)} onTap={() => equip(a.id)} onInfo={openInfo} />)}
      </div>
      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#c79a3e" }}>Removal & situational</div>
      <div className="grid gap-1.5 mb-4">
        {removal.map((a) => <PlayRow key={a.id} aura={a} info={auraInfo[a.id]} ctx={ctx} removal onTap={() => {}} onInfo={openInfo} />)}
      </div>

      <button onClick={() => setShowHelp((v) => !v)} className="text-xs flex items-center gap-1 mb-2" style={{ color: "#8b8778" }}>How scoring works {showHelp ? "▲" : "▼"}</button>
      {showHelp && (
        <div className="text-[12px] leading-relaxed rounded-lg p-3 mb-4" style={{ background: "rgba(255,255,255,0.04)", color: "#b7b1a2" }}>
          <p className="mb-1"><b style={{ color: "#e8b84b" }}>Double strike = damage.</b> Worth current power × connect chance (0.85 with flying/pro-from-creatures, else 0.45). A 2/2 with no evasion ≈ 0.9; a big flyer ≈ its full power again.</p>
          <p><b style={{ color: "#e8b84b" }}>Flat weights:</b> flying 3, first strike 2, vigilance/lifelink/ward/totem 2, hexproof/indestructible/protection 3; +1/power, +0.5/toughness; draw 2; token 1.5; ETB removal 3.</p>
        </div>
      )}
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
function DeckTab({ deck, setDeck, equipped, setEquipped, openInfo, synced, lib, onImport, importing }) {
  const [q, setQ] = useState("");
  const [imp, setImp] = useState("");
  const [report, setReport] = useState(null);

  const toggle = (id) => setDeck((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const rows = lib.filter((a) => !q || norm(a.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name));

  const runImport = async () => {
    if (importing) return;
    const res = await onImport(imp);
    setReport(res);
  };

  return (
    <div className="px-3 pt-4">
      <div className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: "#c79a3e" }}>Deck · what you run</div>
      <p className="text-xs mb-3" style={{ color: "#8b8778" }}>Choose which auras you're running — this powers the Active, Cast & Fetch tabs. {deck.size} auras selected.</p>
      <div className="text-[11px] mb-3 flex items-center gap-1" style={{ color: synced ? "#8fd39a" : "#8b8778" }}>
        {synced ? "✓ Card costs & stats synced from Scryfall" : "Using built-in card data (offline)"}
      </div>

      {/* import */}
      <Card>
        <Lbl>Import a list</Lbl>
        <p className="text-[11px] mb-2" style={{ color: "#8b8778" }}>Paste your Archidekt or MTGGoldfish export (one card per line). Anything not already built in is fetched from Scryfall and added automatically.</p>
        <textarea value={imp} onChange={(e) => setImp(e.target.value)} rows={4} placeholder={"1 On Serra's Wings\n1 Ethereal Armor\n1x Griffin Guide (NEO) 12"}
          className="w-full rounded-lg p-2 text-sm outline-none" style={{ background: "rgba(0,0,0,0.3)", color: "#ece7db", border: "1px solid rgba(255,255,255,0.12)" }} />
        <div className="flex items-center gap-2 mt-2">
          <button onClick={runImport} disabled={importing} className="flex items-center gap-1.5 text-sm font-bold rounded-lg px-3 py-1.5" style={{ background: importing ? "rgba(232,184,75,0.5)" : "#e8b84b", color: "#221a09" }}>
            <Upload size={14} /> {importing ? "Importing…" : "Import"}
          </button>
          <button onClick={() => setDeck(new Set(lib.filter((a) => a.deck).map((a) => a.id)))} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "#cfc9ba" }}>Load deck list</button>
          <button onClick={() => setDeck(new Set())} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "#cfc9ba" }}>Clear</button>
        </div>
        {report && (
          <div className="text-[11px] mt-2 leading-snug" style={{ color: "#b7b1a2" }}>
            <span style={{ color: "#8fd39a" }}>Added {report.matched + report.enriched}</span>
            {report.enriched > 0 && <span> ({report.enriched} newly fetched from Scryfall)</span>}.
            {report.rejected.length > 0 && <span> Couldn't use {report.rejected.length}: {report.rejected.slice(0, 6).join(", ")}{report.rejected.length > 6 ? `, +${report.rejected.length - 6} more` : ""}.</span>}
          </div>
        )}
      </Card>

      {/* search */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Search size={16} style={{ color: "#8b8778" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter library…" className="bg-transparent outline-none text-sm w-full" style={{ color: "#ece7db" }} />
      </div>

      <div className="grid gap-1.5 mb-4">
        {rows.map((a) => (
          <DeckRow key={a.id} a={a} on={deck.has(a.id)} onToggle={() => toggle(a.id)} onInfo={() => openInfo(a)} />
        ))}
      </div>
    </div>
  );
}

function DeckRow({ a, on, onToggle, onInfo }) {
  const h = useTapHold(onToggle, onInfo);
  return (
    <div {...h} className="flex items-center justify-between rounded-lg px-3 py-2 text-left"
      style={{ background: on ? "rgba(232,184,75,0.12)" : "rgba(255,255,255,0.03)", border: on ? "1px solid #e8b84b" : "1px solid rgba(255,255,255,0.07)", cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex items-center justify-center rounded" style={{ width: 20, height: 20, background: on ? "#e8b84b" : "transparent", border: on ? "none" : "1.5px solid rgba(255,255,255,0.25)" }}>
          {on && <Check size={14} style={{ color: "#221a09" }} />}
        </span>
        <span className="font-semibold text-[14px]" style={{ color: on ? "#f0ead9" : "#b7b1a2" }}>{a.name}</span>
      </div>
      <ManaCost aura={a} />
    </div>
  );
}

/* ====================== TAB 4 · ALL AURAS (Scryfall) ====================== */
function AllAurasTab({ onPick, chosenPrints, deckNames }) {
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(() => new Set());
  const [deckOnly, setDeckOnly] = useState(false);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const query = 't:aura id<=w game:paper (o:"enchant creature" or o:"enchant permanent")';
      let url = "https://api.scryfall.com/cards/search?order=name&unique=cards&q=" + encodeURIComponent(query);
      const all = []; let pages = 0;
      while (url && pages < 6) {
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error("Scryfall " + r.status);
        const d = await r.json();
        (d.data || []).forEach((c) => all.push(c));
        url = d.has_more ? d.next_page : null; pages++;
        if (url) await new Promise((res) => setTimeout(res, 90)); // be polite
      }
      setCards(all);
    } catch (e) { setErr(e.message || "Couldn't reach Scryfall."); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const KWORDS = ["flying", "first strike", "double strike", "vigilance", "lifelink", "hexproof", "ward", "indestructible", "protection", "trample", "menace", "deathtouch"];
  const toggleF = (k) => setFilters((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const shown = useMemo(() => {
    if (!cards) return [];
    const t = q.toLowerCase();
    return cards.filter((c) => {
      if (deckOnly && !(deckNames && deckNames.has(c.name))) return false;
      const txt = (c.oracle_text || "").toLowerCase();
      if (t && !c.name.toLowerCase().includes(t) && !txt.includes(t)) return false;
      if (filters.size && ![...filters].every((f) => txt.includes(f))) return false;
      return true;
    });
  }, [cards, q, filters, deckOnly, deckNames]);

  return (
    <div className="px-3 pt-4">
      <div className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: "#c79a3e" }}>Browse · every aura</div>
      <p className="text-xs mb-3" style={{ color: "#8b8778" }}>Every white aura in Magic. Tap a card to set which printing you own; ★ marks cards in your deck. Live from Scryfall.</p>

      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Search size={16} style={{ color: "#8b8778" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or text…" className="bg-transparent outline-none text-sm w-full" style={{ color: "#ece7db" }} />
      </div>
      <NoSwipe className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2" style={{ WebkitOverflowScrolling: "touch" }}>
        <button onClick={() => setDeckOnly((v) => !v)} className="text-[11px] font-bold rounded-full px-3 py-1 whitespace-nowrap flex-shrink-0 flex items-center gap-1"
          style={{ background: deckOnly ? "linear-gradient(160deg,#e8b84b,#c1902f)" : "rgba(232,184,75,0.12)", color: deckOnly ? "#221a09" : "#e8b84b", border: deckOnly ? "none" : "1px solid rgba(232,184,75,0.4)" }}>
          <Star size={11} fill={deckOnly ? "#221a09" : "none"} /> My deck
        </button>
        <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
        <Filter size={13} style={{ color: "#8b8778", flexShrink: 0 }} />
        {KWORDS.map((k) => {
          const on = filters.has(k);
          return <button key={k} onClick={() => toggleF(k)} className="text-[11px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap flex-shrink-0"
            style={{ background: on ? "#e8b84b" : "rgba(255,255,255,0.06)", color: on ? "#221a09" : "#a8a293", border: on ? "none" : "1px solid rgba(255,255,255,0.1)", textTransform: "capitalize" }}>{k}</button>;
        })}
      </NoSwipe>

      {loading && <div className="text-center py-8 text-sm" style={{ color: "#9a9484" }}>Summoning the archive…</div>}
      {err && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(214,93,93,0.12)", color: "#e6939a" }}>
          Couldn't load the live database ({err}). Check your connection and <button onClick={load} className="underline font-bold">retry</button>. The Board, Play, and Deck tabs work offline.
        </div>
      )}

      {cards && !loading && (
        <>
          <div className="text-[11px] mb-2" style={{ color: "#8b8778" }}>{shown.length} of {cards.length} auras{shown.length > 200 ? " · showing first 200" : ""} · tap a card to set your printing</div>
          <div className="grid gap-1.5 mb-4">
            {shown.slice(0, 200).map((c) => {
              const chosen = chosenPrints[c.name];
              const inDeck = deckNames && deckNames.has(c.name);
              return (
                <button key={c.id} onClick={() => onPick(c)} className="text-left rounded-lg px-3 py-2 w-full"
                  style={{ background: inDeck ? "rgba(232,184,75,0.09)" : "rgba(255,255,255,0.04)", border: chosen ? "1px solid rgba(232,184,75,0.7)" : inDeck ? "1px solid rgba(232,184,75,0.4)" : "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "#f0ead9" }}>
                      {inDeck && <Star size={13} style={{ color: "#e8b84b", flexShrink: 0 }} fill="#e8b84b" />}
                      {c.name}
                    </span>
                    <ScryCost cost={c.mana_cost} />
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "#8b8778" }}>{c.type_line}</div>
                  {c.oracle_text && <div className="text-[11.5px] mt-1 leading-snug" style={{ color: "#b7b1a2" }}>{c.oracle_text}</div>}
                  <div className="text-[10px] mt-1.5 font-semibold" style={{ color: chosen ? "#e8b84b" : "#6f6a5d" }}>
                    {chosen ? `✓ Your printing: ${(chosen.setName || (chosen.set || "").toUpperCase())} #${chosen.collector}` : "Tap to choose your set / printing →"}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ====================== shared bits ====================== */
function Card({ children }) { return <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>{children}</div>; }
function Lbl({ children, inline }) { return <div className={"text-xs font-bold uppercase tracking-wide " + (inline ? "" : "mb-2")} style={{ color: "#c79a3e" }}>{children}</div>; }

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

function CardInfoModal({ aura, chosenPrint, onClose }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let ok = true; setState("loading"); setData(null);
    const url = chosenPrint && chosenPrint.set && chosenPrint.collector
      ? `https://api.scryfall.com/cards/${chosenPrint.set}/${chosenPrint.collector}`
      : "https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(aura.name);
    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (ok) { setData(d); setState("ok"); } })
      .catch(() => { if (ok) setState("err"); });
    return () => { ok = false; };
  }, [aura, chosenPrint]);
  const fixedStat = aura.stat && (aura.stat.p || aura.stat.t) ? `+${aura.stat.p}/+${aura.stat.t}` : "";
  const img = (data && getImg(data)) || (chosenPrint && chosenPrint.img) || null;
  const flavor = data && (data.flavor_text || (data.card_faces && data.card_faces[0] && data.card_faces[0].flavor_text));
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl p-4" style={{ background: "#1a1e2b", border: "1px solid rgba(232,184,75,0.4)", maxHeight: "88vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-bold text-lg" style={{ color: "#f0ead9" }}>{aura.name}</div>
          <button onClick={onClose} className="p-1 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><X size={18} style={{ color: "#cfc9ba" }} /></button>
        </div>
        {img && <img src={img} alt={aura.name} className="w-full rounded-xl mb-3" />}
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <ManaCost aura={aura} />
          {fixedStat && <span className="text-sm font-bold" style={{ color: "#cfc9ba" }}>{fixedStat}</span>}
          {data && <span className="text-[11px]" style={{ color: "#8b8778" }}>{data.set_name} · #{data.collector_number}</span>}
        </div>
        {state === "ok" && data ? (
          <>
            <div className="text-[12px] mb-1" style={{ color: "#8b8778" }}>{data.type_line}</div>
            <div className="text-sm leading-snug whitespace-pre-line" style={{ color: "#d8d2c4" }}>{data.oracle_text}</div>
            {flavor && <div className="text-[12.5px] italic leading-snug mt-2 pt-2" style={{ color: "#9a9484", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{flavor}</div>}
            {data.artist && <div className="text-[10px] mt-2" style={{ color: "#6f6a5d" }}>Illus. {data.artist} · © Wizards of the Coast</div>}
          </>
        ) : state === "loading" ? (
          <div className="text-sm" style={{ color: "#9a9484" }}>Loading card…</div>
        ) : (
          <div className="text-sm" style={{ color: "#b7b1a2" }}>{aura.note || "Full text unavailable offline."}</div>
        )}
      </div>
    </div>
  );
}

function PrintingPicker({ card, chosen, onPick, onClose }) {
  const [prints, setPrints] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let ok = true; setState("loading");
    const base = card.prints_search_uri || ("https://api.scryfall.com/cards/search?order=released&unique=prints&q=" + encodeURIComponent('!"' + card.name + '"'));
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
        if (ok) { setPrints(all); setState("ok"); }
      } catch { if (ok) setState("err"); }
    })();
    return () => { ok = false; };
  }, [card]);
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl p-4" style={{ background: "#1a1e2b", border: "1px solid rgba(232,184,75,0.4)", maxHeight: "88vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-bold text-lg" style={{ color: "#f0ead9" }}>{card.name}</div>
          <button onClick={onClose} className="p-1 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><X size={18} style={{ color: "#cfc9ba" }} /></button>
        </div>
        <p className="text-[11px] mb-3" style={{ color: "#8b8778" }}>Tap the printing you own — it becomes the art shown whenever this card comes up.</p>
        {state === "loading" && <div className="text-sm py-6 text-center" style={{ color: "#9a9484" }}>Loading printings…</div>}
        {state === "err" && <div className="text-sm" style={{ color: "#e6939a" }}>Couldn't load printings. Check your connection.</div>}
        {state === "ok" && prints && (
          <div className="grid grid-cols-3 gap-2">
            {prints.map((c) => {
              const sel = chosen && chosen.set === c.set && chosen.collector === c.collector_number;
              const small = getImgSmall(c);
              return (
                <button key={c.id} onClick={() => onPick({ set: c.set, collector: c.collector_number, setName: c.set_name, img: getImg(c), artist: c.artist })}
                  className="rounded-lg overflow-hidden text-left" style={{ border: sel ? "2px solid #e8b84b" : "1px solid rgba(255,255,255,0.1)" }}>
                  {small ? <img src={small} alt={c.set_name} className="w-full" /> : <div className="w-full" style={{ paddingTop: "140%", background: "rgba(255,255,255,0.05)" }} />}
                  <div className="px-1.5 py-1">
                    <div className="text-[10px] font-bold truncate" style={{ color: sel ? "#e8b84b" : "#cfc9ba" }}>{(c.set || "").toUpperCase()}</div>
                    <div className="text-[9px] truncate" style={{ color: "#8b8778" }}>#{c.collector_number}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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

function FetchRow({ a, ev, first, onEquip, onInfo }) {
  const [confirm, setConfirm] = useState(false);
  const h = useTapHold(() => setConfirm(true), onInfo);
  const stop = (e) => e.stopPropagation();
  return (
    <div {...h} className="text-left rounded-lg px-3 py-2 transition"
      style={{ background: first || confirm ? "linear-gradient(160deg, rgba(232,184,75,0.14), rgba(232,184,75,0.05))" : "rgba(255,255,255,0.04)", border: first || confirm ? "1.5px solid #e8b84b" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "#f0ead9" }}>
          {first && <Star size={13} style={{ color: "#e8b84b" }} fill="#e8b84b" />}
          {a.name} <ManaCost aura={a} />
        </div>
        {confirm ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={(e) => { stop(e); onEquip(); }} onPointerDown={stop} onPointerUp={stop} className="text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>Add</button>
            <button onClick={(e) => { stop(e); setConfirm(false); }} onPointerDown={stop} onPointerUp={stop} className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.08)" }}><X size={15} style={{ color: "#cfc9ba" }} /></button>
          </div>
        ) : (
          <div className="text-right flex-shrink-0">
            <div className="text-[9px] uppercase" style={{ color: "#6f6a5d" }}>value</div>
            <div className="text-lg font-bold leading-none" style={{ color: "#e8b84b" }}>{ev.score.toFixed(1)}</div>
          </div>
        )}
      </div>
      <div className="text-[12px] mt-1" style={{ color: "#b7b1a2" }}>{summaryLine(ev) || "No new effect on your current board"}</div>
    </div>
  );
}

/* ====================== TAB · FETCH (Light-Paws trigger) ====================== */
function FetchTab({ deckAuras, equipped, equip, valueOfAdding, curPower, curTough, openInfo }) {
  const [mv, setMv] = useState(2);
  const cap = mv >= 5 ? 99 : mv;

  const pool = deckAuras.filter((a) => !equipped.has(a.id) && a.cmc <= cap);
  const buffs = pool.filter((a) => a.buff && a.canRide)
    .map((a) => ({ a, ev: valueOfAdding([a.id]) }))
    .sort((x, y) => y.ev.score - x.ev.score);

  return (
    <div className="px-3 pt-4">
      <div className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: "#c79a3e" }}>Fetch · trigger tutor</div>
      <p className="text-xs mb-1" style={{ color: "#8b8778" }}>
        Cast an Aura, then tap its mana value. Light-Paws fetches any Aura of that value <b>or less</b> whose name you don't already control — ranked best-first for your board (Light-Paws is {curPower}/{curTough}).
      </p>

      <div className="text-[11px] font-bold uppercase mb-1.5 mt-3" style={{ color: "#c79a3e" }}>Mana value of the Aura you cast</div>
      <NoSwipe className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = mv === n;
          return (
            <button key={n} onClick={() => setMv(n)} className="flex-1 rounded-lg font-bold text-lg py-2.5"
              style={{ background: on ? "linear-gradient(160deg,#e8b84b,#c1902f)" : "rgba(255,255,255,0.05)", color: on ? "#221a09" : "#cfc9ba", border: on ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
              {n === 5 ? "5+" : n}
            </button>
          );
        })}
      </NoSwipe>

      <div className="text-xs mb-2" style={{ color: "#8b8778" }}>
        {buffs.length} fetchable to equip · cost ≤ {mv >= 5 ? "any" : mv} · tap then confirm · hold for card
      </div>
      <div className="grid gap-1.5 mb-4">
        {buffs.map(({ a, ev }, i) => (
          <FetchRow key={a.id} a={a} ev={ev} first={i === 0} onEquip={() => equip(a.id)} onInfo={() => openInfo(a)} />
        ))}
        {buffs.length === 0 && <div className="text-sm italic py-3 text-center" style={{ color: "#6f6a5d" }}>No fetchable equip auras left at this cost.</div>}
      </div>

      <p className="text-[11px] mb-6" style={{ color: "#6f6a5d" }}>
        Removal auras (Pacifism, Arrest, Reprobation…) aren't shown here — Light-Paws can only attach a fetch to itself, so those are cards you cast from hand on the Play tab.
      </p>
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
  if (!AD_CLIENT) {
    return (
      <div className="rounded-lg text-center text-[11px] py-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "#5f5a4e" }}>
        Ad space
      </div>
    );
  }
  return (
    <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={AD_CLIENT} data-ad-slot={AD_SLOT} data-ad-format="horizontal" data-full-width-responsive="true" />
  );
}

function TabFooter() {
  return (
    <div className="px-3 pt-3 pb-6">
      <AdBanner />
      {DONATE_URL && (
        <div className="flex items-center justify-center mt-3">
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-4 py-2"
            style={{ background: "linear-gradient(160deg,#e8b84b,#c1902f)", color: "#221a09" }}>
            <Heart size={14} /> Support this app
          </a>
        </div>
      )}
      <p className="text-[10px] leading-snug text-center mt-4" style={{ color: "#5f5a4e" }}>
        Light-Paws Console is unofficial Fan Content permitted under the Fan Content Policy.
        Not approved/endorsed by Wizards. Portions of the materials used are property of
        Wizards of the Coast. ©Wizards of the Coast LLC. Card data &amp; images courtesy of Scryfall.
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
