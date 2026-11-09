'use strict';

/* ======================================================================
   Семейный календарь-круг.
   Geometry and colours follow the printed version's generator (gen3.py):
   a 1600×1600 drawing centred at (800, 800), January at the top.
   ====================================================================== */

const STORE_KEY = 'wheel.events.v1';

const C = 800;
const R_OUT = 795;          // outer edge
const R_DAY = 752;          // day-number ring: R_DAY..R_OUT
const R_EV1 = 540;          // event zone: R_EV1..R_DAY
const R_MON0 = 386;         // month-name ring: R_MON0..R_EV1 (the season core is 20% smaller than before)
const R_CORE = R_MON0;      // season pictures: 0..R_CORE
const RV = R_DAY - 29;      // outer band (lane 0) radius
const RV_W = 51;            // band width
const RV_GAP = 6;           // gap between band lanes
const MAX_LANES = 3;        // lanes towards the centre; more bands share the last one
const RIBBON_COL = ['#6b9be0', '#6fbf55', '#ff9f1c', '#e88a3a'];   // default: by the start month's season
const BAND_COLORS = ['#ff9f1c', '#e88a3a', '#e0475b', '#e86aa6', '#8e6bd8', '#6b9be0', '#1fa89a', '#6fbf55', '#a0713d', '#7a7a7a'];
const bandColor = (e) => e.color || RIBBON_COL[SEASON_OF[e.month - 1]];
const TODAY_SCALE = 1;                     // today's cell on the month scale: ordinary size, just framed
const TODAY_FAR_SCALE = 2;                 // the same on the year and season scale (no other numbers): width, number
const TODAY_FAR_LEN = 1.3;                 // ...but its length across the ring grows only this much
const NEAR_W = 900;                        // view box narrower than this = month scale: all numbers shown
const TODAY_OUT = (R_DAY + R_OUT) / 2 + (R_OUT - R_DAY) * TODAY_FAR_LEN / 2;   // its outer edge
const FULL_BOX = { x: -45, y: -45, w: 1690, h: 1690 };
const CARD_H = 72;          // icon on top, name (ENAME_FS) under it
const CARD_K = 1.5;         // cards are drawn this much larger than their base size
const MON_FS = 43.7, MONPL_FS = 34.3;   // month names, Russian and Polish (also in style.css)
const ENAME_FS = 22.1;      // card title (also in style.css); the icon stays 27
const TODAY_NUM_K = 1.5;    // today's number is this much larger than the other day numbers
const CARD_REACH = 40;      // a card is looked for this many degrees either side of its date
const CARD_DETOUR = 60;     // a card never sits further than this past its nearest spot: rather overlap
const CARD_DETOUR_NEAR = 40; // the same when zoomed in, where cards should hug their dates more
                            // (both at full card size: they shrink with the cards)
const cardDetour = (s) => (s < 0.999 ? CARD_DETOUR_NEAR : CARD_DETOUR) * s;
const CARD_AWAY = 1.5;      // a spot whose centre lies in another month counts as this many card heights further
const FONT = getComputedStyle(document.documentElement).getPropertyValue('--font').trim()
  || 'Inter, system-ui, Roboto, sans-serif';

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_PL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const SEASON_OF = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0];   // 0 winter, 1 spring, 2 summer, 3 autumn
const CORE_COL = ['#a7c8ef', '#b2e09f', '#ffd97a', '#f6b77a'];
const EV_COL = ['#d4e4f7', '#dcf1d2', '#fff0c4', '#fbdcb8'];
const EV_COL2 = ['#c7dbf3', '#cfeac2', '#ffe9ab', '#f8cfa0'];
const DAY_COL = ['#93bdea', '#9fd68b', '#ffcf5a', '#f3a865'];
const CARD_COL = ['#6b9be0', '#6fbf55', '#f0b400', '#e88a3a'];
const HL_COL = '#e0475b';

const EMOJIS = ['🎂', '🎁', '🎉', '🎈', '💐', '🌷', '🎄', '🎃', '🎮', '📚',
  '🎒', '⭐', '❤️', '🎵', '⚽', '🏊', '🚲', '✈️', '🏖️', '🎨',
  '🎭', '🐶', '🐱', '🦄', '🍕', '🍰', '🏆', '🎬', '🎪', '🎤'];

/* ---------------- small helpers ---------------- */

const $ = (id) => document.getElementById(id);
const mod = (a, n) => ((a % n) + n) % n;
const f1 = (n) => n.toFixed(1);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pt(a, r) {
  const t = a * Math.PI / 180;
  return [C + r * Math.sin(t), C - r * Math.cos(t)];
}
function polar(x, y) {
  const dx = x - C, dy = y - C;
  return { r: Math.hypot(dx, dy), a: mod(Math.atan2(dx, -dy) * 180 / Math.PI, 360) };
}
function sectorPath(a0, a1, r0, r1) {
  const big = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = pt(a0, r1), [x1, y1] = pt(a1, r1);
  if (r0 <= 0.5) {
    return `M${C},${C} L${f1(x0)},${f1(y0)} A${r1},${r1} 0 ${big} 1 ${f1(x1)},${f1(y1)} Z`;
  }
  const [x2, y2] = pt(a1, r0), [x3, y3] = pt(a0, r0);
  return `M${f1(x0)},${f1(y0)} A${r1},${r1} 0 ${big} 1 ${f1(x1)},${f1(y1)} ` +
    `L${f1(x2)},${f1(y2)} A${r0},${r0} 0 ${big} 0 ${f1(x3)},${f1(y3)} Z`;
}
function angIn(ang, a0, a1) { return mod(ang - a0, 360) <= a1 - a0; }
function ov(A, B, g) {
  return A[0] < B[0] + B[2] + g && B[0] < A[0] + A[2] + g &&
         A[1] < B[1] + B[3] + g && B[1] < A[1] + A[3] + g;
}
function overlapArea(A, B) {
  const w = Math.min(A[0] + A[2], B[0] + B[2]) - Math.max(A[0], B[0]);
  const h = Math.min(A[1] + A[3], B[1] + B[3]) - Math.max(A[1], B[1]);
  return w > 0 && h > 0 ? w * h : 0;
}
/* Does the segment (x1,y1)-(x2,y2), ends trimmed, pass through box b grown by g? */
function segHits(x1, y1, x2, y2, b, g) {
  const xmin = b[0] - g, xmax = b[0] + b[2] + g, ymin = b[1] - g, ymax = b[1] + b[3] + g;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1];
  let t0 = 0.01, t1 = 0.99;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 <= t1;
}
function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

const measureCtx = document.createElement('canvas').getContext('2d');
function textW(text, weight, size) {
  measureCtx.font = `${weight} ${size}px ${FONT}`;
  return measureCtx.measureText(text).width;
}

/* ---------------- calendar state ---------------- */

let year, days, today;   // today = { m, d }, months 0-based

function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function setToday() {
  const n = new Date();
  year = n.getFullYear();
  today = { m: n.getMonth(), d: n.getDate() };
  days = [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
}
const clampDay = (m, d) => Math.min(d, days[m]);
const dateAngle = (m, d) => m * 30 - 15 + (d - 0.5) / days[m] * 30;
const cellStart = (m, d) => m * 30 - 15 + (d - 1) / days[m] * 30;
const dateText = (m, d) => `${d} ${MONTHS_GEN[m]}`;

/* ---------------- data ---------------- */

let items = [];

function sanitize(list) {
  if (!Array.isArray(list)) throw new Error('not a list');
  const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  return list.map((e) => {
    if (!e || typeof e !== 'object' || !int(e.month, 1, 12) || !int(e.day, 1, 31)) return null;
    const kind = e.kind === 'period' ? 'period' : 'event';
    const out = {
      id: typeof e.id === 'string' && e.id ? e.id : uuid(),
      kind,
      title: String(e.title ?? '').slice(0, 14),
      icon: typeof e.icon === 'string' && e.icon ? e.icon.slice(0, 8) : '⭐',
      month: e.month,
      day: e.day,
    };
    if (kind === 'period') {
      if (!int(e.endMonth, 1, 12) || !int(e.endDay, 1, 31)) return null;
      out.endMonth = e.endMonth;
      out.endDay = e.endDay;
    }
    if (Number.isInteger(e.year)) out.year = e.year;
    if (kind === 'period' && typeof e.color === 'string' && /^#[0-9a-f]{6}$/i.test(e.color)) out.color = e.color;
    return out;
  }).filter(Boolean);
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    items = raw ? sanitize(JSON.parse(raw)) : [];
  } catch (e) {
    items = [];
  }
}
function saveItems() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  } catch (e) {
    alert('Не получилось сохранить: ' + e.message);
  }
}

const shownThisYear = () => items.filter((e) => e.year == null || e.year === year);
const shownEvents = () => shownThisYear().filter((e) => e.kind === 'event');

/* One-time import: https://…/#data=<base64url(JSON)> */
function decodeB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function importFromHash() {
  const h = location.hash;
  if (!h.startsWith('#data=')) return;
  // Drop the data from the address bar straight away.
  history.replaceState(history.state, '', location.pathname + location.search);
  let list;
  try {
    list = sanitize(JSON.parse(decodeB64url(h.slice(6))));
  } catch (e) {
    alert('Ссылка с событиями повреждена.');
    return;
  }
  if (!list.length) return;
  if (!confirm(`Загрузить ${list.length} ${plural(list.length, 'событие', 'события', 'событий')}?`)) return;
  const byId = new Map(items.map((e) => [e.id, e]));
  for (const e of list) byId.set(e.id, e);
  items = [...byId.values()];
  saveItems();
}

/* ---------------- multi-day events: bands ---------------- */

function monthsCovered(a0, a1) {
  const ms = [];
  for (let m = 0; m < 12; m++) {
    const s0 = m * 30 - 15;
    if (angIn(s0 + 0.01, a0, a1) || angIn(a0, s0, s0 + 30)) ms.push(m);
  }
  return ms;
}

/* Each multi-day event is a band along the event zone. The first band in a
   month lies by the day ring; another band in the same month gets its own
   lane, closer to the centre. Earlier (then longer) events go outermost. */
function ribbons() {
  const list = shownThisYear().filter((e) => e.kind === 'period').map((e) => ({ ev: e, ...periodArc(e) }));
  list.sort((p, q) => (p.ev.month - q.ev.month) || (p.ev.day - q.ev.day) || ((q.a1 - q.a0) - (p.a1 - p.a0)));
  const used = Array.from({ length: 12 }, () => new Set());
  for (const rb of list) {
    const ms = monthsCovered(rb.a0, rb.a1);
    let lane = 0;
    while (lane < MAX_LANES - 1 && ms.some((m) => used[m].has(lane))) lane++;
    for (const m of ms) used[m].add(lane);
    rb.lane = lane;
    rb.r = RV - lane * (RV_W + RV_GAP);
    // pull the ends in by the round cap, so the band covers exactly its days
    const cap = (RV_W / 2) / rb.r * 180 / Math.PI;
    if (rb.a1 - rb.a0 > 2 * cap) { rb.a0 += cap; rb.a1 -= cap; }
    else { const mid = (rb.a0 + rb.a1) / 2; rb.a0 = mid - 0.01; rb.a1 = mid + 0.01; }
  }
  return list;
}
function inRibbon(ang, r, pad, rbs) {
  for (const rb of rbs) {
    if (Math.abs(r - rb.r) < RV_W / 2 + pad && angIn(ang, rb.a0 - 3, rb.a1 + 3)) return true;
  }
  return false;
}

/* ---------------- label placement ---------------- */

/* Box b lies wholly in month m (or up to `spill` degrees past its sides), between
   radii r0 and r1, and off the holiday band.
   The box never contains the centre, so its angular extent is set by its corners. */
function boxOk(m, b, r0, r1, n, rbs, spill = 0) {
  const [x0, y0, w, h] = b;
  const start = m * 30 - 15;
  let rmax = 0;
  for (let k = 0; k < 4; k++) {
    const dx = (k & 1 ? x0 + w : x0) - C, dy = (k & 2 ? y0 + h : y0) - C;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r >= r1) return false;
    if (r > rmax) rmax = r;
    const rel = mod(Math.atan2(dx, -dy) * 57.29577951308232 - start + 180, 360) - 180;
    if (!(rel > 1 - spill && rel < 29 + spill)) return false;
  }
  const rmin = Math.hypot(Math.max(x0 - C, 0, C - x0 - w), Math.max(y0 - C, 0, C - y0 - h));
  if (rmin <= r0) return false;
  // holiday band: only sample the edges when the box reaches its radius
  if (rbs.some((rb) => rmax > rb.r - RV_W / 2 - 6 && rmin < rb.r + RV_W / 2 + 6)) {
    for (let i = 0; i <= n; i++) {
      const fx = x0 + w * i / n, fy = y0 + h * i / n;
      for (const [px, py] of [[fx, y0], [fx, y0 + h], [x0, fy], [x0 + w, fy]]) {
        const { r, a } = polar(px, py);
        if (inRibbon(a, r, 6, rbs)) return false;
      }
    }
  }
  return true;
}

function monthLabelSize(m) {
  return [Math.max(textW(MONTHS[m], 800, MON_FS), textW(MONTHS_PL[m], 600, MONPL_FS)) + 12, 91];
}
function labelCands(m, rbs) {
  const key = `L|${m}`;
  const cached = candCache.get(key);
  if (cached) return cached;
  const [w, h] = monthLabelSize(m);
  const out = [];
  for (let r = R_MON0 + 10; r < R_DAY; r += 6) {
    for (const da of [0, -3, 3, -6, 6, -9, 9]) {
      const [x, y] = pt(m * 30 + da, r);
      const b = [x - w / 2, y - h / 2, w, h];
      if (boxOk(m, b, R_MON0 + 6, R_DAY - 6, 10, rbs)) out.push(b);
    }
  }
  if (!out.length) {
    const [x, y] = pt(m * 30, (R_MON0 + R_EV1) / 2 + 20);
    out.push([x - w / 2, y - h / 2, w, h]);
  }
  candCache.set(key, out);
  return out;
}

const cardBaseW = (ev) => Math.max(textW(ev.title, 800, ENAME_FS), 30) + 22;

/* A card may sit anywhere in the event zone (any month's), off the holiday bands. */
const ringOk = (b, rbs) => boxOk(0, b, R_MON0 + 4, R_DAY - 4, 20, rbs, Infinity);

/* Candidate spots depend only on the date, card size, zoom and the holiday bands,
   so they are kept between redraws: adding one event only measures its own size. */
let candCache = new Map();
let candSig = '';
function syncCandCache(rbs) {
  const sig = rbs.map((r) => `${r.a0.toFixed(2)}:${r.a1.toFixed(2)}:${r.r}`).join(',') + `|${days[1]}`;
  if (sig !== candSig || candCache.size > 3000) { candCache = new Map(); candSig = sig; }
}
/* Spots around angle a0, nearest to the anchor (ax, ay) first. L is the distance,
   plus a penalty for a spot whose centre is in another month than the date. */
function sortedCands(a0, w, h, s, rbs, ax, ay) {
  const key = `${a0.toFixed(2)}|${w.toFixed(1)}|${h.toFixed(1)}|${s.toFixed(3)}`;
  let out = candCache.get(key);
  if (out) return out;
  out = [];
  const mStart = Math.floor((a0 + 15) / 30) * 30 - 15;
  const away = (a) => (a < mStart || a > mStart + 30 ? CARD_AWAY * h : 0);
  const aStep = Math.max(0.5, s), rStep = Math.max(3, 8 * s);
  for (let a = a0 - CARD_REACH; a <= a0 + CARD_REACH + 1e-6; a += aStep) {
    for (let r = R_MON0 + 4 + h / 2; r < R_DAY - 4 - h / 2 + 1e-6; r += rStep) {
      const [x, y] = pt(a, r);
      const b = [x - w / 2, y - h / 2, w, h];
      if (ringOk(b, rbs)) out.push({ c: { x, y, b }, L: Math.hypot(x - ax, y - ay) + away(a) });
    }
  }
  out.sort((p, q) => p.L - q.L);
  candCache.set(key, out);
  return out;
}

/* Greedy placement, in date order: each card takes the free spot nearest its date,
   off every month name and every card already placed. Cards with no free spot
   are stacked under the others. `names` are the month name boxes. */
function layoutCards(evs, s, rbs, names, strict = true, quick = false) {
  const placed = [];
  const gap = 4 * s;
  for (const ev of evs) {
    const m = ev.month - 1;
    const w = cardBaseW(ev) * s * CARD_K, h = CARD_H * s * CARD_K;
    const d = clampDay(m, ev.day);
    const ang = dateAngle(m, d);
    const [ax, ay] = pt(ang, R_DAY);
    const all = sortedCands(ang, w, h, s, rbs, ax, ay);
    const reach = all.length ? all[all.length - 1].L + w + h : 0;
    const nb = names.filter((o) => Math.hypot(o[0] + o[2] / 2 - ax, o[1] + o[3] / 2 - ay) < reach);
    // never on a month name; only if there is no room at all, as little on one as possible
    const offName = ({ c }) => !nb.some((o) => ov(c.b, o, gap));
    const free = placed.filter((p) => !p.stacked);
    let best = null;
    // the nearest spot off the names; a free spot much further than that is too far:
    // then the card stays near its date and overlaps its neighbours instead
    const first = all.find(offName);
    const maxL = (first ? first.L : 0) + cardDetour(s);
    for (const q of all) {
      const { c } = q;
      if (q.L > maxL) break;
      if (!offName(q)) continue;
      if (free.some((p) => ov(c.b, p.b, gap))) continue;
      if (nb.some((o) => segHits(ax, ay, c.x, c.y, o, 3 * s))) continue;
      // leader lines normally keep clear of other cards; when space is short they may pass under them
      if (strict && free.some((p) => segHits(ax, ay, c.x, c.y, p.b, 4 * s))) continue;
      if (strict && free.some((p) => segHits(p.ax, p.ay, p.cx, p.cy, c.b, 4 * s))) continue;
      best = c;
      break;
    }
    let stacked = false, noSpot = false, scored = null;
    if (!best) {
      stacked = true;
      scored = all.filter((q) => q.L <= maxL && offName(q));
      noSpot = !scored.length;
      if (noSpot) scored = all;
      if (quick) scored = scored.slice(0, 1);   // just counting: the nearest will do
      let bestScore = Infinity;
      // overlap is allowed, but no card may be mostly hidden: at most 45% of the smaller one
      for (const limit of [0.45, 0.7, 1.01]) {
        for (const { c, L } of scored) {
          let o = 0, worst = 0;
          for (const p of placed) {
            const a = overlapArea(c.b, p.b);
            o += a;
            worst = Math.max(worst, a / Math.min(c.b[2] * c.b[3], p.b[2] * p.b[3]));
          }
          if (worst > limit) continue;
          const score = o / (s * s) + L / s;
          if (score < bestScore) { bestScore = score; best = c; }
        }
        if (best) break;
      }
      if (!best) {
        const [x, y] = pt(ang, (R_EV1 + R_DAY) / 2);
        best = { x, y, b: [x - w / 2, y - h / 2, w, h] };
      }
    }
    placed.push({ ev, m, d, b: best.b, cx: best.x, cy: best.y, ax, ay, stacked, s, scored, noSpot, Lmin: all.length ? all[0].L : 0 });
  }
  for (const p of placed) delete p.scored;
  return placed;
}

/* Not everything fits: let the cards overlap as little as possible. Each card in
   turn moves to the spot (off the month name) that gives the least overlap with
   the others, no card ever being mostly hidden, then keeps a short leader line. */
function spreadOut(placed, s, obst = []) {
  const area = (b) => b[2] * b[3];
  // two cards can only meet if their dates are near (a card stays within CARD_REACH of its date)
  const nearAt = (p, x, y) => Math.hypot(p.ax - x, p.ay - y) < 800;
  const nbr = placed.map((p, i) => placed.map((q, j) => j).filter((j) => j !== i && nearAt(placed[j], p.ax, p.ay)));
  const nobst = placed.map((p) => obst.filter((b) => nearAt(p, b[0] + b[2] / 2, b[1] + b[3] / 2)));
  // simulated annealing over the candidate spots (fixed seed: the layout is repeatable)
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const cur = placed.map((p) => ({ b: p.b, x: p.cx, y: p.cy }));
  const at = (i) => ({ b: cur[i].b, x: cur[i].x, y: cur[i].y });
  const total = () => placed.reduce((a, p, i) => {
    const q = at(i);
    return a + cost2(i, q, Math.hypot(q.x - p.ax, q.y - p.ay));
  }, 0);
  const cost2 = (i, c, L) => {
    // like cost(), but against the current (not yet applied) positions of the others
    let o = 0, worst = 0, cross = 0;
    for (const j of nbr[i]) {
      const q = cur[j];
      const a = overlapArea(c.b, q.b);
      o += a;
      worst = Math.max(worst, a / Math.min(area(c.b), area(q.b)));
      if (segHits(placed[i].ax, placed[i].ay, c.x, c.y, q.b, 4 * s)) cross++;
      if (segHits(placed[j].ax, placed[j].ay, q.x, q.y, c.b, 4 * s)) cross++;
    }
    for (const b of nobst[i]) {
      const a = overlapArea(c.b, b);
      o += a;
      worst = Math.max(worst, a / Math.min(area(c.b), area(b)));
    }
    return o / (s * s) + 1.0 * L / s + 250 * cross + (worst > 0.45 ? 2e5 * (worst - 0.45) : 0);
  };
  // only the stacked cards and the ones around them move; the rest stay where they are
  const hot = placed.filter((p) => p.stacked);
  const movable = placed.map((p, i) => i).filter((i) => placed[i].scored.length &&
    hot.some((q) => Math.hypot(q.ax - placed[i].ax, q.ay - placed[i].ay) < 500));
  let now = total(), bestTotal = now, bestState = cur.map((c) => ({ ...c }));
  const steps = 600 * Math.max(1, movable.length);
  for (let k = 0; k < steps && movable.length; k++) {
    const T = 3000 * Math.pow(0.003, k / steps);
    const i = movable[Math.floor(rnd() * movable.length)];
    const { c, L } = placed[i].scored[Math.floor(rnd() * placed[i].scored.length)];
    const before = cost2(i, at(i), Math.hypot(cur[i].x - placed[i].ax, cur[i].y - placed[i].ay));
    // moving card i changes its pair terms with the others (both directions), so compare just those
    const after = cost2(i, c, L);
    const d = after - before;
    if (d <= 0 || rnd() < Math.exp(-d / T)) {
      cur[i] = { b: c.b, x: c.x, y: c.y };
      now += d;
      if (now < bestTotal - 1e-6) { bestTotal = now; bestState = cur.map((q) => ({ ...q })); }
    }
  }
  bestState.forEach((q, i) => { placed[i].b = q.b; placed[i].cx = q.x; placed[i].cy = q.y; });
  for (let i = 0; i < placed.length; i++) {
    placed[i].stacked = placed.some((q, j) => j !== i && overlapArea(placed[i].b, q.b) > 0);
  }
}

/* Date order; if a card ends up stacked, also try the reverse order and keep the better. */
const countStacked = (pl) => pl.filter((p) => p.stacked).length;
/* quick: skip spreading stacked cards out (enough to compare name positions). */
function bestLayout(evs, s, rbs, names, quick = false) {
  let best = null;
  search: for (const strict of [true, false]) {
    for (const list of [evs, [...evs].reverse()]) {
      const pl = layoutCards(list, s, rbs, names, strict, quick);
      if (!best || countStacked(pl) < countStacked(best)) best = pl;
      if (!countStacked(best)) break search;
      if (evs.length < 2) break;
    }
  }
  if (!quick && countStacked(best)) {
    for (const p of best) {
      const off = sortedCands(dateAngle(p.m, p.d), p.b[2], p.b[3], s, rbs, p.ax, p.ay)
        .filter(({ c }) => !names.some((o) => ov(c.b, o, 4 * s)));
      p.scored = off.length ? off.filter((q) => q.L <= off[0].L + cardDetour(s)) : off;
    }
    spreadOut(best, s, names);
    for (const p of best) delete p.scored;
  }
  return best;
}

function eventsByMonth() {
  const by = Array.from({ length: 12 }, () => []);
  for (const e of shownEvents()) by[e.month - 1].push(e);
  for (const list of by) list.sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  return by;
}

let labels = [];         // month label boxes, chosen at full size
let fullCards = [];      // card layout at full size

/* Lower is better: cards with no spot off the names are the worst, then stacked
   cards, then leader length. */
function layoutCost(pl) {
  let k = 0;
  for (const p of pl) k += (p.noSpot ? 1e8 : 0) + (p.stacked ? 1e6 : 0) + Math.hypot(p.cx - p.ax, p.cy - p.ay);
  return k;
}

function computeFull() {
  const rbs = ribbons();
  syncCandCache(rbs);
  const by = eventsByMonth();
  const evs = by.flat();
  // every name hugs the inner edge of the ring; the cards go wherever is nearest their dates
  const home = [];
  for (let m = 0; m < 12; m++) home[m] = labelCands(m, rbs)[0];
  labels = [...home];
  let pl = bestLayout(evs, 1, rbs, labels, true);
  // ...but a name that keeps a card away from its date may step aside (along its month, or
  // outwards), as long as that brings the cards nearer than it moves the name
  const moved = (m, b) => 0.5 * Math.hypot(b[0] - home[m][0], b[1] - home[m][1]);
  const near = (m) => [-1, 0, 1].flatMap((k) => by[mod(m + k, 12)]);
  let budget = 1200;   // cards laid out in trials, in all (a count, not a time: the layout must not jump)
  for (let sweep = 0; sweep < 3 && budget > 0; sweep++) {
    // months whose name may be in the way: around every card noticeably off its best spot
    const todo = new Set();
    for (const p of pl) {
      if (p.stacked || Math.hypot(p.cx - p.ax, p.cy - p.ay) - p.Lmin > 25) {
        for (const k of [-1, 0, 1]) todo.add(mod(p.m + k, 12));
      }
    }
    let better = false;
    for (const m of [...todo].sort((a, b) => a - b)) {
      const local = near(m);
      const keep = labels[m];
      let pick = keep;
      let cost = layoutCost(bestLayout(local, 1, rbs, labels, true)) + moved(m, keep);
      // up to 30 spots, spread over everything within reach
      const reach = labelCands(m, rbs).filter((b) => b !== keep && moved(m, b) <= 150);
      const step = Math.ceil(reach.length / 30);
      const cands = reach.filter((b, i) => i % step === 0);
      for (const lab of cands) {
        if ((budget -= local.length) < 0) break;
        labels[m] = lab;
        const c = layoutCost(bestLayout(local, 1, rbs, labels, true)) + moved(m, lab);
        if (c < cost - 1) { cost = c; pick = lab; }
      }
      labels[m] = pick;
      if (pick !== keep) better = true;
    }
    if (!better) break;
    pl = bestLayout(evs, 1, rbs, labels, true);
  }
  fullCards = bestLayout(evs, 1, rbs, labels);
}

/* ---------------- views, zoom ---------------- */

const svg = $('wheel');
const baseG = $('base');
const overlayG = $('overlay');

let view = { t: 'full' };
let vb = { ...FULL_BOX };
let viewCards = [];
let raised = [];          // ids brought to the front, last = topmost
let animId = 0;
let afterZoom = null;      // runs once the current zoom animation ends
let pickId = null;         // the picked event: outlined, with its delete and edit buttons
let pickTimer = 0;         // a tapped event gets picked a moment after the zoom to it ends
const PICK_PAUSE = 250;    // ms between the end of that zoom and the pick
function cancelPickTimer() { clearTimeout(pickTimer); pickTimer = 0; }

const MIN_SIDE = 220;      // closest pinch zoom: svg units across the screen

/* Keep a square view box between MIN_SIDE and the whole circle, never past its edges. */
function clampBox(b) {
  const w = Math.min(FULL_BOX.w, Math.max(MIN_SIDE, b.w));
  const x = Math.min(Math.max(b.x, FULL_BOX.x), FULL_BOX.x + FULL_BOX.w - w);
  const y = Math.min(Math.max(b.y, FULL_BOX.y), FULL_BOX.y + FULL_BOX.h - w);
  return { x, y, w, h: w };
}

/* Square box around an arc of the ring, from the month names to the outer edge. */
function arcBox(a0, a1, withCore) {
  const ptsList = withCore ? [[C, C]] : [];
  const n = Math.max(2, Math.ceil((a1 - a0) / 2.5));
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    if (withCore) ptsList.push(pt(a, TODAY_OUT + 5));
    else ptsList.push(pt(a, R_MON0 - 6), pt(a, TODAY_OUT + 5));
  }
  const xs = ptsList.map((p) => p[0]), ys = ptsList.map((p) => p[1]);
  const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10;
  const w = Math.max(...xs) + 10 - x0, h = Math.max(...ys) + 10 - y0;
  const side = Math.max(w, h);
  return { x: x0 - (side - w) / 2, y: y0 - (side - h) / 2, w: side, h: side };
}

/* The days a multi-day event covers, as an arc: start of its first cell to end of its last. */
function periodArc(e) {
  const m0 = e.month - 1, m1 = e.endMonth - 1;
  const a0 = cellStart(m0, clampDay(m0, e.day));
  let a1 = cellStart(m1, clampDay(m1, e.endDay)) + 30 / days[m1];
  while (a1 <= a0) a1 += 360;
  return { a0, a1 };
}

/* Where a tap on an event zooms to first: its month, or the whole band of a
   multi-day event (a band inside one month: just that month). */
function eventView(e) {
  if (e.kind !== 'period') return { t: 'month', m: e.month - 1, sel: null };
  const { a0, a1 } = periodArc(e);
  const ms = monthsCovered(a0, a1);
  if (ms.length === 1) return { t: 'month', m: ms[0], sel: null };
  return { t: 'period', id: e.id };
}

function boxFor(v) {
  if (v.t === 'full') return { ...FULL_BOX };
  if (v.t === 'free') return clampBox(v.box);
  if (v.t === 'season') return arcBox(v.s * 90 - 45, v.s * 90 + 45, true);
  if (v.t === 'period') {
    const e = items.find((x) => x.id === v.id);
    if (!e || e.kind !== 'period') return { ...FULL_BOX };
    let { a0, a1 } = periodArc(e);
    if (a1 - a0 >= 300) return { ...FULL_BOX };
    const grow = Math.max(4, (30 - (a1 - a0)) / 2);   // never closer than a month
    return clampBox(arcBox(a0 - grow, a1 + grow, false));
  }
  return arcBox(v.m * 30 - 15, v.m * 30 + 15, false);
}
const sameBox = (a, b) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.5);
function setVB(b) {
  svg.setAttribute('viewBox', `${f1(b.x)} ${f1(b.y)} ${f1(b.w)} ${f1(b.h)}`);
  svg.classList.toggle('far', b.w >= NEAR_W);   // year/season scale: hide day numbers
  liveCards(b);
}
/* While zooming (pinch, wheel, animation) the cards follow cardScaleAt() on screen, each about
   its centre; once the zoom settles they are laid out again at that size. */
function liveCards(b) {
  const s = cardScaleAt(b.w);
  for (const el of overlayG.querySelectorAll('.card')) {
    el.setAttribute('transform', `translate(${el.dataset.c}) scale(${(s * CARD_K).toFixed(4)})`);
  }
  for (const el of overlayG.querySelectorAll('.lead')) {
    el.setAttribute('stroke-width', (2.5 * s).toFixed(2));
    el.setAttribute('stroke-dasharray', `${(6 * s).toFixed(2)} ${(6 * s).toFixed(2)}`);
  }
}
const pxPerUnit = () => (svg.clientWidth || 360) / vb.w;
/* Card size (1 = full size, in circle units) for a view box of width w: on screen the cards
   grow only a little while zooming in, up to CARD_NEAR_K times their whole-circle size once a
   month (MONTH_W across) fills the screen. */
const CARD_NEAR_K = 1.5, MONTH_W = 530;
function cardScaleAt(w) {
  const t = Math.min(1, Math.max(0, (FULL_BOX.w - w) / (FULL_BOX.w - MONTH_W)));
  return Math.min(1, w / FULL_BOX.w * (1 + (CARD_NEAR_K - 1) * t));
}
const cardScale = () => cardScaleAt(vb.w);

function viewMonths(v) {
  if (v.t === 'free') {          // every month with a part inside the box
    const b = v.box, inBox = ([x, y]) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    return [...Array(12).keys()].filter((m) => {
      for (let a = m * 30 - 15; a <= m * 30 + 15; a += 3) {
        for (const r of [R_MON0, R_EV1, R_DAY, R_OUT]) if (inBox(pt(a, r))) return true;
      }
      return false;
    });
  }
  if (v.t === 'season') {
    const ms = [0, 1, 2, 3, 4].map((i) => mod(v.s * 3 - 2 + i, 12));
    return ms;
  }
  if (v.t === 'period') {
    const e = items.find((x) => x.id === v.id);
    if (!e || e.kind !== 'period') return [...Array(12).keys()];
    const { a0, a1 } = periodArc(e);
    return [...new Set(monthsCovered(a0 - 30, a1 + 30))];
  }
  return [mod(v.m - 1, 12), v.m, mod(v.m + 1, 12)];
}

function computeViewLayout() {
  if (view.t === 'full') { viewCards = fullCards; return; }
  const s = cardScale();
  if (s >= 0.999) {
    viewCards = fullCards;   // cards may sit far from their month: keep them all
    return;
  }
  const rbs = ribbons();
  syncCandCache(rbs);
  const by = eventsByMonth();
  // a card may sit a month or so off its own: lay out the neighbours' too
  const ms = new Set(viewMonths(view).flatMap((m) => [mod(m - 1, 12), m, mod(m + 1, 12)]));
  viewCards = bestLayout(by.filter((l, m) => ms.has(m)).flat(), s, rbs, labels);
}

function zoomDone() {
  const f = afterZoom;
  afterZoom = null;
  if (f) f();
}

function setView(v) {
  cancelPickTimer();   // any other zoom drops a pick still waiting
  view = v;
  const target = boxFor(v);
  renderChrome();
  if (sameBox(target, vb)) {
    computeViewLayout();
    renderOverlay();
    zoomDone();
    return;
  }
  const from = { ...vb };
  const id = ++animId;
  const t0 = performance.now(), dur = 380;
  overlayG.classList.add('fading');
  const step = (now) => {
    if (id !== animId) return;
    const t = Math.min(1, (now - t0) / dur);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    vb = {
      x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e,
      w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e,
    };
    setVB(vb);
    if (t < 1) { requestAnimationFrame(step); return; }
    vb = target;
    computeViewLayout();
    renderOverlay();
    overlayG.classList.remove('fading');
    zoomDone();
  };
  requestAnimationFrame(step);
}

/* Zoom history: each zoom is a history entry, so Android's Back zooms out. */
const depth = () => (history.state && history.state.depth) || 0;
function navigate(v) {
  history.pushState({ depth: depth() + 1, view: v }, '');
  setView(v);
}
function replaceView(v) {
  history.replaceState({ depth: depth(), view: v }, '');
  setView(v);
}
function goFull() {
  const d = depth();
  if (d > 0) history.go(-d);
  else if (view.t !== 'full') replaceView({ t: 'full' });
}
window.addEventListener('popstate', (e) => {
  closeDialogs();
  afterZoom = null;
  cancelPickTimer();
  unpick();
  setView((e.state && e.state.view) || { t: 'full' });
});

/* ---------------- rendering ---------------- */

function highlightedDays() {
  const hl = new Set();
  for (const e of shownEvents()) {
    hl.add(`${e.month - 1}-${clampDay(e.month - 1, e.day)}`);
  }
  return hl;
}

function renderBase() {
  const out = [];
  const defs = [];
  const hl = highlightedDays();
  const rbs = ribbons();

  out.push(`<circle cx="${C}" cy="${C}" r="${R_OUT + 4}" fill="#fff"/>`);

  // season core background (shows if the picture is missing)
  [0, 90, 180, 270].forEach((mid, i) => {
    out.push(`<path d="${sectorPath(mid - 45, mid + 45, 0, R_CORE)}" fill="${CORE_COL[i]}" stroke="#fff" stroke-width="7"/>`);
  });

  // month sectors and day ring
  for (let m = 0; m < 12; m++) {
    const a0 = m * 30 - 15, a1 = m * 30 + 15, sn = SEASON_OF[m];
    out.push(`<path d="${sectorPath(a0, a1, R_MON0, R_DAY)}" fill="${(m % 2 === 0 ? EV_COL : EV_COL2)[sn]}" stroke="#fff" stroke-width="4"/>`);
    out.push(`<path d="${sectorPath(a0, a1, R_DAY, R_OUT)}" fill="${DAY_COL[sn]}" stroke="#fff" stroke-width="4"/>`);
  }

  // season pictures
  out.push(`<image href="assets/seasons.webp" x="${C - R_CORE}" y="${C - R_CORE}" width="${2 * R_CORE}" height="${2 * R_CORE}" clip-path="url(#coreclip)" preserveAspectRatio="none"/>`);
  for (const a of [45, 135, 225, 315]) {
    const [x, y] = pt(a, R_CORE);
    out.push(`<line x1="${C}" y1="${C}" x2="${f1(x)}" y2="${f1(y)}" stroke="#fff" stroke-width="7"/>`);
  }
  out.push(`<circle cx="${C}" cy="${C}" r="${R_CORE}" fill="none" stroke="#fff" stroke-width="7"/>`);

  // month names: Russian, Polish under it
  for (let m = 0; m < 12; m++) {
    const [x0, y0, w] = labels[m];
    const cx = x0 + w / 2;
    out.push(`<text class="mon" x="${f1(cx)}" y="${f1(y0 + 42)}">${MONTHS[m]}</text>` +
      `<text class="monpl" x="${f1(cx)}" y="${f1(y0 + 81)}">${MONTHS_PL[m]}</text>`);
  }

  // multi-day events: bands, with as much of "icon title" as fits
  rbs.forEach((rb, i) => {
    const R = rb.r;
    const big = rb.a1 - rb.a0 > 180 ? 1 : 0;
    const [xs, ys] = pt(rb.a0, R), [xe, ye] = pt(rb.a1, R);
    const midA = mod((rb.a0 + rb.a1) / 2, 360);
    // the text may run into the round caps, so its path reaches into them
    const ext = (RV_W * 0.4) / R * 180 / Math.PI;
    const [txs, tys] = pt(rb.a0 - ext, R), [txe, tye] = pt(rb.a1 + ext, R);
    const tBig = rb.a1 - rb.a0 + 2 * ext > 180 ? 1 : 0;
    const textPath = midA > 90 && midA < 270
      ? `M${f1(txe)},${f1(tye)} A${R},${R} 0 ${tBig} 0 ${f1(txs)},${f1(tys)}`
      : `M${f1(txs)},${f1(tys)} A${R},${R} 0 ${tBig} 1 ${f1(txe)},${f1(tye)}`;
    defs.push(`<path id="rib${i}" d="${textPath}"/>`);
    const room = R * (rb.a1 - rb.a0) * Math.PI / 180 + RV_W * 0.8;
    const { icon, title } = rb.ev;
    // the longest label that fits, at the largest of three sizes
    let label = '', size = 37.5;
    search: for (const t of [`${icon} ${title}`, title, icon]) {
      for (const fs of [37.5, 30, 24]) {
        if (textW(t, 800, fs) + fs * 0.08 * [...t].length <= room) { label = t; size = fs; break search; }
      }
    }
    const col = bandColor(rb.ev);
    out.push(`<g data-period="${esc(rb.ev.id)}" style="--pick:${col}">` +
      `<path d="M${f1(xs)},${f1(ys)} A${R},${R} 0 ${big} 1 ${f1(xe)},${f1(ye)}" stroke="${col}" stroke-width="${RV_W}" fill="none" stroke-linecap="round"/>` +
      (label ? `<text class="vac" dy="${f1(size * 0.36)}" style="font-size:${size}px;letter-spacing:${f1(size * 0.08)}px"><textPath href="#rib${i}" startOffset="50%" text-anchor="middle">${esc(label)}</textPath></text>` : '') +
      `</g>`);
  });

  // day cells and numbers (the numbers show only on the month scale)
  const nums = [];
  for (let m = 0; m < 12; m++) {
    const n = days[m], a0 = m * 30 - 15;
    for (let d = 1; d <= n; d++) {
      const c0 = a0 + (d - 1) / n * 30, am = c0 + 15 / n;
      if (d > 1) {
        const [x1, y1] = pt(c0, R_DAY + 2), [x2, y2] = pt(c0, R_OUT - 1);
        out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#fff" stroke-width="1.2" opacity=".8"/>`);
      }
      if (m === today.m && d === today.d) continue;   // drawn last, on top
      const [x, y] = pt(am, (R_DAY + R_OUT) / 2);
      const rot = mod(am, 360) < 180 ? am - 90 : am + 90;
      const isHl = hl.has(`${m}-${d}`);
      if (isHl) out.push(`<path d="${sectorPath(c0 + 0.08, c0 + 30 / n - 0.08, R_DAY + 2, R_OUT - 2)}" fill="${HL_COL}"/>`);
      nums.push(`<text class="dnum${isHl ? ' hl' : ''}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)})">${d}</text>`);
    }
  }

  out.push(`<g class="daynums">${nums.join('')}</g>`);

  // today: the cell grown around its own centre, dark rounded frame, same fill; the number
  // stays where it is. ordinary size on the month scale, on the year and season scale 2× as wide but only 1.3× as long.
  {
    const { m, d } = today;
    const span = 30 / days[m], mid = cellStart(m, d) + span / 2;
    const rMid = (R_DAY + R_OUT) / 2;
    const isHl = hl.has(`${m}-${d}`);
    const [x, y] = pt(mid, rMid);
    const rot = mod(mid, 360) < 180 ? mid - 90 : mid + 90;
    const fill = isHl ? HL_COL : DAY_COL[SEASON_OF[m]], ink = isHl ? '#fff' : '#1d1d1f';
    for (const [cls, k, len] of [['today-near', TODAY_SCALE, TODAY_SCALE], ['today-far', TODAY_FAR_SCALE, TODAY_FAR_LEN]]) {
      // the cell is so narrow that a rotated rounded rectangle matches the ring's curve
      const w = rMid * span * k * Math.PI / 180, h = (R_OUT - R_DAY) * len;
      out.push(`<g class="${cls}">` +
        `<rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(4 * k)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(mid)})" fill="${fill}" stroke="#1d1d1f" stroke-width="${2 * k}"/>` +
        `<text class="dnum now" style="fill:${ink};font-size:${f1(13.5 * TODAY_NUM_K * k)}px" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)})">${d}</text></g>`);
    }
  }

  baseG.innerHTML = `<defs>${defs.join('')}</defs>${out.join('')}`;
  markPicked();
}

let renderedOrder = [];

function renderOverlay() {
  const out = [];
  const rank = (c) => {
    const i = raised.indexOf(c.ev.id);
    return i >= 0 ? 2 + i : (c.stacked ? 0 : 1);
  };
  const cards = [...viewCards].sort((a, b) => rank(a) - rank(b));
  renderedOrder = cards;

  for (const c of cards) {
    out.push(`<line class="lead" x1="${f1(c.ax)}" y1="${f1(c.ay)}" x2="${f1(c.cx)}" y2="${f1(c.cy)}" stroke="#6f6f6f" stroke-width="${(2.5 * c.s).toFixed(2)}" stroke-dasharray="${(6 * c.s).toFixed(2)} ${(6 * c.s).toFixed(2)}"/>`);
  }
  for (const c of cards) {
    const w = c.b[2];
    const k = c.s * CARD_K, bw = w / k;
    // scaled about its centre, so that liveCards() can keep its screen size while zooming
    out.push(`<g class="card" style="--pick:${CARD_COL[SEASON_OF[c.m]]}" data-id="${esc(c.ev.id)}" data-c="${f1(c.cx)},${f1(c.cy)}" transform="translate(${f1(c.cx)},${f1(c.cy)}) scale(${k.toFixed(4)})">` +
      `<g transform="translate(${f1(-bw / 2)},${-CARD_H / 2})">` +
      `<rect width="${f1(bw)}" height="${CARD_H}" rx="15" fill="#fff" stroke="${CARD_COL[SEASON_OF[c.m]]}" stroke-width="4" filter="url(#sh)"/>` +
      `<text class="emo" x="${f1(bw / 2)}" y="32">${esc(c.ev.icon)}</text>` +
      `<text class="ename" x="${f1(bw / 2)}" y="62">${esc(c.ev.title)}</text></g></g>`);
  }

  if (pickId !== null) out.push(pickButtons(cards));
  if (view.t === 'month' && view.sel) out.push(plusButton(view.sel));
  overlayG.innerHTML = out.join('');
  markPicked();
}

/* The picked event's buttons, a constant size on screen: a red "×" (delete) at the
   top right corner of its card and a pencil (edit) at the top left; on a band,
   the same way round on screen: the "×" at its right end, the pencil at its left. */
function pickButtons(cards) {
  const u = 1 / pxPerUnit();
  const R = 19 * u, pad = 6 * u;
  let p0, p1;
  const c = cards.find((q) => q.ev.id === pickId);
  if (c) {
    const [x0, y0, w] = c.b;
    p0 = [x0 + 4 * u, y0 + 4 * u];
    p1 = [x0 + w - 4 * u, y0 + 4 * u];
  } else {
    const rb = ribbons().find((q) => q.ev.id === pickId);
    if (!rb) return '';
    p0 = pt(rb.a0, rb.r);
    p1 = pt(rb.a1, rb.r);
    if (p0[0] > p1[0]) [p0, p1] = [p1, p0];
  }
  const keep = ([x, y]) => [Math.min(Math.max(x, vb.x + R + pad), vb.x + vb.w - R - pad),
    Math.min(Math.max(y, vb.y + R + pad), vb.y + vb.h - R - pad)];
  const btn = (act, [x, y], fill, glyph) =>
    `<g data-act="${act}" transform="translate(${f1(x)},${f1(y)}) scale(${u.toFixed(4)})">` +
    `<circle r="19" fill="${fill}" stroke="#fff" stroke-width="3" filter="url(#sh)"/>${glyph}</g>`;
  return btn('edit', keep(p0), '#1f5fd1',
      '<path d="M-8,8 l2.5-7.5 l10-10 l5,5 l-10,10 z M2.5,-6.5 l5,5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>') +
    btn('del', keep(p1), '#e0475b',
      '<path d="M-6.5,-6.5 L6.5,6.5 M6.5,-6.5 L-6.5,6.5" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>');
}

function plusButton({ m, d }) {
  const u = 1 / pxPerUnit();                  // svg units per screen pixel
  const bw = 56, bh = 56;                     // a round "+" button
  const a = dateAngle(m, d), t = a * Math.PI / 180;
  const n = days[m], c0 = cellStart(m, d);
  // keep the whole button inside the ring, 14 px clear of it
  const extent = Math.abs(Math.sin(t)) * bw / 2 + Math.abs(Math.cos(t)) * bh / 2;
  let [cx, cy] = pt(a, R_DAY - (14 + extent) * u);
  const pad = 8 * u;
  cx = Math.min(Math.max(cx, vb.x + bw * u / 2 + pad), vb.x + vb.w - bw * u / 2 - pad);
  cy = Math.min(Math.max(cy, vb.y + bh * u / 2 + pad), vb.y + vb.h - bh * u / 2 - pad);
  return `<path d="${sectorPath(c0, c0 + 30 / n, R_DAY, R_OUT)}" fill="none" stroke="#1f5fd1" stroke-width="${f1(4 * u)}"/>` +
    `<g data-plus="1" transform="translate(${f1(cx - bw * u / 2)},${f1(cy - bh * u / 2)}) scale(${u.toFixed(4)})">` +
    `<circle cx="${bw / 2}" cy="${bh / 2}" r="${bw / 2}" fill="#1f5fd1" filter="url(#sh)"/>` +
    `<path d="M${bw / 2 - 12},${bh / 2} H${bw / 2 + 12} M${bw / 2},${bh / 2 - 12} V${bh / 2 + 12}" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></g>`;
}

function renderChrome() {
  $('today').textContent = `Сегодня: ${dateText(today.m, today.d)}`;
  $('back').hidden = view.t === 'full';
  $('hint').textContent = view.t === 'full'
    ? 'Нажми на сезон, месяц или число'
    : view.t === 'season' || view.t === 'free'
      ? 'Нажми на месяц или число'
      : view.sel ? 'Нажми «+», чтобы добавить событие' : 'Нажми на число';
}

function rebuildAll() {
  computeFull();
  renderBase();
  computeViewLayout();
  renderOverlay();
  renderChrome();
}

/* ---------------- taps ---------------- */

function toSvg(clientX, clientY) {
  const p = svg.createSVGPoint();
  p.x = clientX; p.y = clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  return [q.x, q.y];
}

function raiseIds(ids) {
  raised = raised.filter((id) => !ids.includes(id)).concat(ids);
}

/* Pick an event: outline it (its card to the front) and show its delete and edit buttons. */
function pick(id) {
  const e = items.find((x) => x.id === id);
  if (!e) return;
  pickId = id;
  if (e.kind === 'event') raiseIds([id]);
  if (view.t === 'month' && view.sel) replaceView({ t: 'month', m: view.m, sel: null });   // no "+" beside it
  else renderOverlay();
}
function unpick() {
  if (pickId === null) return;
  pickId = null;
  renderOverlay();
}

/* A tap on an event zooms to it first and picks it a moment after. Already in view
   (the zoom it would go to, or a close free zoom that shows it whole): it is picked at once. */
function zoomToEvent(el) {
  const id = el.dataset.id || el.dataset.period;
  const e = items.find((x) => x.id === id);
  if (!e) return false;
  const v = eventView(e);
  const same = v.t === view.t && (v.t === 'month' ? v.m === view.m : v.id === view.id);
  if (same) return false;
  if (view.t === 'free' && vb.w < NEAR_W) {
    const r = el.getBoundingClientRect(), s = svg.getBoundingClientRect();
    if (r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1) return false;
  }
  afterZoom = () => { pickTimer = setTimeout(() => { pickTimer = 0; pick(id); }, PICK_PAUSE); };
  navigate(v);
  return true;
}

function onTap(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const act = el && el.closest('[data-act]');
  if (act) {
    const ev = items.find((x) => x.id === pickId);
    if (ev && act.dataset.act === 'del') deleteEvent(ev);
    if (ev && act.dataset.act === 'edit') openForm(ev);
    return;
  }
  if (el && el.closest('[data-plus]')) { unpick(); openForm(null, view.sel); return; }
  const target = el && (el.closest('.card') || el.closest('[data-period]'));
  if (target) {
    const id = target.dataset.id || target.dataset.period;
    if (id === pickId) return;
    unpick();
    if (!zoomToEvent(target)) pick(id);
    return;
  }
  unpick();   // a tap anywhere else lets go of the picked event

  const [x, y] = toSvg(clientX, clientY);
  const { r, a } = polar(x, y);
  if (r > TODAY_OUT + 20) return;
  const m = Math.floor(mod(a + 15, 360) / 30);

  if (r <= R_CORE) {
    const s = Math.round(a / 90) % 4;
    if (!(view.t === 'season' && view.s === s)) navigate({ t: 'season', s });
    return;
  }

  // a day: only a tap on the day ring itself
  if (r >= R_DAY - 6) {
    const rel = mod(a - (m * 30 - 15), 360);
    const d = Math.min(days[m], Math.floor(rel / 30 * days[m]) + 1);
    raiseIds(shownEvents().filter((e) => e.month - 1 === m && clampDay(m, e.day) === d).map((e) => e.id));
    const v = { t: 'month', m, sel: { m, d } };
    if (view.t === 'month' && view.m === m) replaceView(v);
    else navigate(v);
    return;
  }

  // the month area: zoom into that month; inside the zoomed month it just hides the "+"
  if (view.t === 'month' && view.m === m) { if (view.sel) replaceView({ t: 'month', m, sel: null }); }
  else navigate({ t: 'month', m, sel: null });
}

/* Taps, double tap (back to the whole circle), and map-like zoom:
   pinch zooms around the fingers from any view, one finger drags a zoomed circle. */
const pointers = new Map();
let gesture = null;
let lastTap = null, tapTimer = 0;

function handleTap(x, y) {
  if (view.t === 'full') { onTap(x, y); return; }
  const now = performance.now();
  if (lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) {
    clearTimeout(tapTimer);
    lastTap = null;
    goFull();
    return;
  }
  lastTap = { t: now, x, y };
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { lastTap = null; onTap(x, y); }, 260);
}

function stopAnimation() {
  animId++;
  overlayG.classList.remove('fading');
}
/* svg point under a screen point, for the view box b */
function svgAt(b, clientX, clientY) {
  const r = svg.getBoundingClientRect();
  return [b.x + (clientX - r.left) / r.width * b.w, b.y + (clientY - r.top) / r.height * b.h];
}
/* the box of width w that keeps svg point (px, py) under screen point (clientX, clientY) */
function boxKeeping(px, py, clientX, clientY, w) {
  const r = svg.getBoundingClientRect();
  w = Math.min(FULL_BOX.w, Math.max(MIN_SIDE, w));
  return clampBox({ x: px - (clientX - r.left) / r.width * w, y: py - (clientY - r.top) / r.height * w, w, h: w });
}

/* After a pinch, drag or wheel: the circle stays where the fingers left it. */
function commitFree() {
  if (vb.w >= FULL_BOX.w - 1) {
    vb = { ...FULL_BOX };
    setVB(vb);
    if (view.t !== 'full') goFull();
    else { computeViewLayout(); renderOverlay(); }
    return;
  }
  const v = { t: 'free', box: { ...vb } };
  if (depth() === 0) history.pushState({ depth: 1, view: v }, '');
  else history.replaceState({ depth: depth(), view: v }, '');
  view = v;
  renderChrome();
  computeViewLayout();
  renderOverlay();
}

function startPinch() {
  const [p, q] = [...pointers.values()];
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  stopAnimation();
  gesture.tap = false;
  gesture.mode = 'pinch';
  gesture.d0 = Math.max(1, Math.hypot(p.x - q.x, p.y - q.y));
  gesture.w0 = vb.w;
  [gesture.px, gesture.py] = svgAt(vb, mx, my);
}

svg.addEventListener('pointerdown', (e) => {
  afterZoom = null;   // touching the wheel while a tap on an event is still under way: stop there
  cancelPickTimer();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    gesture = { x: e.clientX, y: e.clientY, t: performance.now(), tap: true, mode: null };
  } else if (pointers.size === 2 && gesture) {
    startPinch();
  }
});
svg.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gesture.mode === 'pinch') {
    if (pointers.size < 2) return;
    const [p, q] = [...pointers.values()];
    const d = Math.max(1, Math.hypot(p.x - q.x, p.y - q.y));
    vb = boxKeeping(gesture.px, gesture.py, (p.x + q.x) / 2, (p.y + q.y) / 2, gesture.w0 * gesture.d0 / d);
    setVB(vb);
    return;
  }
  const moved = Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 12;
  if (!moved && !gesture.mode) return;
  gesture.tap = false;
  if (vb.w >= FULL_BOX.w - 1) return;            // nothing to drag at full size
  if (!gesture.mode) {
    stopAnimation();
    gesture.mode = 'pan';
    [gesture.px, gesture.py] = svgAt(vb, gesture.x, gesture.y);
  }
  vb = boxKeeping(gesture.px, gesture.py, e.clientX, e.clientY, vb.w);
  setVB(vb);
});
function pointerEnd(e) {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size > 0 || !gesture) return;
  const g = gesture;
  gesture = null;
  if (g.mode) { commitFree(); return; }
  if (e.type === 'pointerup' && g.tap && performance.now() - g.t < 600) handleTap(e.clientX, e.clientY);
}
svg.addEventListener('pointerup', pointerEnd);
svg.addEventListener('pointercancel', pointerEnd);

/* mouse wheel / trackpad: the same zoom, around the pointer */
let wheelTimer = 0;
svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  stopAnimation();
  const [px, py] = svgAt(vb, e.clientX, e.clientY);
  vb = boxKeeping(px, py, e.clientX, e.clientY, vb.w * Math.exp(e.deltaY * 0.0015));
  setVB(vb);
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(commitFree, 200);
}, { passive: false });

$('back').addEventListener('click', goFull);

/* ---------------- delete (with undo) ---------------- */

const formDlg = $('form');

function closeDialogs() {
  if (formDlg.open) formDlg.close();
  if (confirmDlg.open) confirmDlg.close();
}
formDlg.addEventListener('click', (e) => { if (e.target === formDlg) formDlg.close(); });

/* The outline of the picked event, in its own colour. */
function markPicked() {
  for (const el of svg.querySelectorAll('.picked')) el.classList.remove('picked');
  if (pickId === null) return;
  for (const el of svg.querySelectorAll('.card, [data-period]')) {
    if ((el.dataset.id || el.dataset.period) === pickId) el.classList.add('picked');
  }
}

/* The "×" asks first, in a small window: "Удалить «…»?" with the date, Отмена / Удалить. */
const confirmDlg = document.createElement('dialog');
confirmDlg.className = 'confirm';
confirmDlg.innerHTML = '<div class="confirm-head"></div>' +
  '<div class="confirm-actions"><button type="button" data-no>Отмена</button>' +
  '<button type="button" class="danger" data-yes>Удалить</button></div>';
document.body.append(confirmDlg);
confirmDlg.addEventListener('click', (e) => { if (e.target === confirmDlg) confirmDlg.close(); });
confirmDlg.querySelector('[data-no]').addEventListener('click', () => confirmDlg.close());
let confirmYes = null;
confirmDlg.querySelector('[data-yes]').addEventListener('click', () => {
  confirmDlg.close();
  if (confirmYes) confirmYes();
});

function whenText(ev) {
  const start = dateText(ev.month - 1, ev.day);
  return ev.kind === 'period' ? `${start} — ${dateText(ev.endMonth - 1, ev.endDay)}` : start;
}

function deleteEvent(ev) {
  confirmDlg.querySelector('.confirm-head').innerHTML =
    `Удалить ${esc(ev.icon)} «${esc(ev.title)}»?<small>${esc(whenText(ev))}</small>`;
  confirmYes = () => {
    items = items.filter((e) => e !== ev);
    raised = raised.filter((r) => r !== ev.id);
    pickId = null;
    saveItems();
    rebuildAll();
  };
  confirmDlg.showModal();
}

/* ---------------- add / edit form ---------------- */

const form = $('eventForm');
const F = form.elements;   // named inputs (F.title would be the form's own title)
let editing = null;      // the item being edited, or null for a new event

function fillMonths(sel) {
  sel.replaceChildren(...MONTHS_GEN.map((name, i) => new Option(name, String(i + 1))));
}
function fillDays(sel, month, keep) {
  const n = days[month - 1];
  sel.replaceChildren(...Array.from({ length: n }, (_, i) => new Option(String(i + 1), String(i + 1))));
  sel.value = String(Math.min(keep || 1, n));
}
function setupForm() {
  fillMonths(F.month);
  fillMonths(F.endMonth);
  F.month.addEventListener('change', () => fillDays(F.day, +F.month.value, +F.day.value));
  F.endMonth.addEventListener('change', () => fillDays(F.endDay, +F.endMonth.value, +F.endDay.value));
  $('iconGrid').innerHTML = EMOJIS.map((e, i) =>
    `<label><input type="radio" name="icon" value="${e}"${i === 0 ? ' checked' : ''}><span>${e}</span></label>`).join('');
  $('colorGrid').innerHTML = BAND_COLORS.map((c) =>
    `<label><input type="radio" name="color" value="${c}"><span style="background:${c}"></span></label>`).join('');
  $('formCancel').addEventListener('click', () => formDlg.close());
  F.multi.addEventListener('change', () => {
    setMultiMode(F.multi.checked);
    if (F.multi.checked) {   // start the end date on the next day
      const m = +F.month.value, d = +F.day.value;
      const nm = d < days[m - 1] ? m : (m % 12) + 1, nd = d < days[m - 1] ? d + 1 : 1;
      F.endMonth.value = String(nm);
      fillDays(F.endDay, nm, nd);
    }
  });
  form.addEventListener('submit', onSave);
}

function pickColor(c) {
  let r = [...form.querySelectorAll('input[name="color"]')].find((x) => x.value.toLowerCase() === c.toLowerCase());
  if (!r) {   // a colour not in the set (e.g. a season default)
    $('colorGrid').insertAdjacentHTML('afterbegin', `<label><input type="radio" name="color" value="${esc(c)}"><span style="background:${esc(c)}"></span></label>`);
    r = form.querySelector('input[name="color"]');
  }
  r.checked = true;
}

function setMultiMode(on) {
  form.classList.toggle('is-period', on);
  $('startLabel').textContent = on ? 'Начало' : 'Дата';
}

function openForm(ev, date) {
  editing = ev || null;
  const isPeriod = !!ev && ev.kind === 'period';
  F.multi.checked = isPeriod;
  setMultiMode(isPeriod);
  $('formTitle').textContent = ev ? 'Изменить событие' : 'Новое событие';

  const month = ev ? ev.month : date.m + 1;
  const day = ev ? ev.day : date.d;
  F.title.value = ev ? ev.title : '';
  F.month.value = String(month);
  fillDays(F.day, month, day);
  if (isPeriod) {
    F.endMonth.value = String(ev.endMonth);
    fillDays(F.endDay, ev.endMonth, ev.endDay);
  }
  const icon = ev ? ev.icon : EMOJIS[0];
  let match = [...form.querySelectorAll('input[name="icon"]')].find((r) => r.value === icon);
  if (!match) {
    // keep an icon that is not in the set (e.g. from an import)
    $('iconGrid').insertAdjacentHTML('afterbegin', `<label><input type="radio" name="icon" value="${esc(icon)}"><span>${esc(icon)}</span></label>`);
    match = form.querySelector('input[name="icon"]');
  }
  match.checked = true;
  F.yearly.checked = !(ev && ev.year);
  pickColor(ev && ev.kind === 'period' ? bandColor(ev) : RIBBON_COL[SEASON_OF[month - 1]]);
  formDlg.showModal();
  if (!ev) F.title.focus();
}

function onSave(e) {
  e.preventDefault();
  const title = F.title.value.trim().slice(0, 14);
  if (!title) { F.title.focus(); return; }
  const isPeriod = F.multi.checked;
  const item = {
    id: editing ? editing.id : uuid(),
    kind: isPeriod ? 'period' : 'event',
    title,
    icon: form.querySelector('input[name="icon"]:checked').value,
    month: +F.month.value,
    day: +F.day.value,
  };
  if (isPeriod) {
    item.endMonth = +F.endMonth.value;
    item.endDay = +F.endDay.value;
    item.color = form.querySelector('input[name="color"]:checked').value;
  }
  if (!F.yearly.checked) item.year = editing && editing.year ? editing.year : year;
  if (editing) items = items.map((x) => (x.id === editing.id ? item : x));
  else items.push(item);
  if (!isPeriod) raiseIds([item.id]);
  saveItems();
  formDlg.close();
  rebuildAll();
}

/* ---------------- day change ---------------- */

function refreshDay() {
  const before = `${year}-${today.m}-${today.d}`;
  setToday();
  if (`${year}-${today.m}-${today.d}` !== before) rebuildAll();
}
function scheduleMidnight() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
  setTimeout(() => { refreshDay(); scheduleMidnight(); }, next - n);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });

/* ---------------- start ---------------- */

async function start() {
  setToday();
  loadItems();
  importFromHash();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await document.fonts.ready; } catch (e) { /* fonts are optional */ }

  setupForm();
  if (!history.state) history.replaceState({ depth: 0, view: { t: 'full' } }, '');
  view = history.state.view || { t: 'full' };
  computeFull();
  renderBase();
  vb = boxFor(view);
  setVB(vb);
  computeViewLayout();
  renderOverlay();
  renderChrome();
  scheduleMidnight();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { computeViewLayout(); renderOverlay(); }, 100);
  });
}

start();
