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
const TODAY_SCALE = 1.5;                   // today's cell and number vs. an ordinary day
const TODAY_OUT = (R_DAY + R_OUT) / 2 + (R_OUT - R_DAY) * TODAY_SCALE / 2;   // its outer edge
const FULL_BOX = { x: -45, y: -45, w: 1690, h: 1690 };
const CARD_H = 66;
const CARD_K = 1.5;         // cards are drawn this much larger than their base size
const CARD_PX = 13;         // cards stop growing once their name is this many screen px
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
      approx: !!e.approx,
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
  const list = shownThisYear().filter((e) => e.kind === 'period').map((e) => {
    const m0 = e.month - 1, m1 = e.endMonth - 1;
    const d0 = clampDay(m0, e.day), d1 = clampDay(m1, e.endDay);
    // from the start of the first day's cell to the end of the last day's cell
    const c0 = cellStart(m0, d0);
    let c1 = cellStart(m1, d1) + 30 / days[m1];
    while (c1 <= c0) c1 += 360;
    return { ev: e, a0: c0, a1: c1 };
  });
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

/* Box b lies wholly in month m, between radii r0 and r1, and off the holiday band.
   The box never contains the centre, so its angular extent is set by its corners. */
function boxOk(m, b, r0, r1, n, rbs) {
  const [x0, y0, w, h] = b;
  const start = m * 30 - 15;
  let rmax = 0;
  for (let k = 0; k < 4; k++) {
    const dx = (k & 1 ? x0 + w : x0) - C, dy = (k & 2 ? y0 + h : y0) - C;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r >= r1) return false;
    if (r > rmax) rmax = r;
    const rel = mod(Math.atan2(dx, -dy) * 57.29577951308232 - start, 360);
    if (!(rel > 1 && rel < 29)) return false;
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
  return [Math.max(textW(MONTHS[m], 800, 33.6), textW(MONTHS_PL[m], 600, 26.4)) + 12, 70];
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

const cardBaseW = (ev) => Math.max(textW(ev.title, 800, 17), 30) + 22;

/* Candidate spots depend only on month, card size, zoom and the holiday bands,
   so they are kept between redraws: adding one event only measures its own size. */
let candCache = new Map();
let candSig = '';
function syncCandCache(rbs) {
  const sig = rbs.map((r) => `${r.a0.toFixed(2)}:${r.a1.toFixed(2)}:${r.r}`).join(',') + `|${days[1]}`;
  if (sig !== candSig || candCache.size > 3000) { candCache = new Map(); candSig = sig; }
}
function cardCands(m, w, h, s, rbs) {
  const key = `${m}|${w.toFixed(1)}|${h.toFixed(1)}|${s.toFixed(3)}`;
  let out = candCache.get(key);
  if (out) return out;
  out = [];
  const aStep = Math.max(0.5, s), rStep = Math.max(3, 8 * s);
  for (let a = m * 30 - 14; a <= m * 30 + 14 + 1e-6; a += aStep) {
    for (let r = R_MON0 + 4 + h / 2; r < R_DAY - 4 - h / 2 + 1e-6; r += rStep) {
      const [x, y] = pt(a, r);
      const b = [x - w / 2, y - h / 2, w, h];
      if (boxOk(m, b, R_MON0 + 4, R_DAY - 4, 20, rbs)) out.push({ x, y, b });
    }
  }
  candCache.set(key, out);
  return out;
}

/* Candidates for one card, nearest to its date first (cached per layout pass). */
function sortedCands(m, d, w, h, s, rbs, ax, ay) {
  const key = `s|${m}|${d}|${w.toFixed(1)}|${h.toFixed(1)}|${s.toFixed(3)}`;
  let out = candCache.get(key);
  if (!out) {
    out = cardCands(m, w, h, s, rbs)
      .map((c) => ({ c, L: Math.hypot(c.x - ax, c.y - ay) }))
      .sort((p, q) => p.L - q.L);
    candCache.set(key, out);
  }
  return out;
}

/* Greedy placement, earliest date first: each card takes the free spot with the
   shortest leader line. Cards with no free spot are stacked under the others. */
function layoutMonth(m, evs, s, label, rbs, strict = true) {
  const placed = [];
  const gap = 4 * s;
  for (const ev of evs) {
    const w = cardBaseW(ev) * s * CARD_K, h = CARD_H * s * CARD_K;
    const d = clampDay(m, ev.day);
    const [ax, ay] = pt(dateAngle(m, d), R_DAY);
    const scored = sortedCands(m, d, w, h, s, rbs, ax, ay)
      .filter(({ c }) => !label || !ov(c.b, label, gap));
    const free = placed.filter((p) => !p.stacked);
    let best = null;
    for (const { c } of scored) {
      if (free.some((p) => ov(c.b, p.b, gap))) continue;
      if (label && segHits(ax, ay, c.x, c.y, label, 3 * s)) continue;
      // leader lines normally keep clear of other cards; when space is short they may pass under them
      if (strict && free.some((p) => segHits(ax, ay, c.x, c.y, p.b, 4 * s))) continue;
      if (strict && free.some((p) => segHits(p.ax, p.ay, p.cx, p.cy, c.b, 4 * s))) continue;
      best = c;
      break;
    }
    let stacked = false;
    if (!best) {
      stacked = true;
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
        const [x, y] = pt(dateAngle(m, d), (R_EV1 + R_DAY) / 2);
        best = { x, y, b: [x - w / 2, y - h / 2, w, h] };
      }
    }
    placed.push({ ev, m, d, b: best.b, cx: best.x, cy: best.y, ax, ay, stacked, s, scored, noSpot: !scored.length });
  }
  if (placed.some((p) => p.stacked)) spreadOut(placed, s);
  for (const p of placed) delete p.scored;
  return placed;
}

/* Not everything fits: let the cards overlap as little as possible. Each card in
   turn moves to the spot (off the month name) that gives the least overlap with
   the others, no card ever being mostly hidden, then keeps a short leader line. */
function spreadOut(placed, s) {
  const area = (b) => b[2] * b[3];
  const cost = (i, c, L) => {
    let o = 0, worst = 0, cross = 0;
    for (let j = 0; j < placed.length; j++) {
      if (j === i) continue;
      const q = placed[j];
      const a = overlapArea(c.b, q.b);
      o += a;
      worst = Math.max(worst, a / Math.min(area(c.b), area(q.b)));
      if (segHits(placed[i].ax, placed[i].ay, c.x, c.y, q.b, 4 * s)) cross++;
      if (segHits(q.ax, q.ay, q.cx, q.cy, c.b, 4 * s)) cross++;
    }
    return o / (s * s) + 1.0 * L / s + 250 * cross + (worst > 0.45 ? 2e5 * (worst - 0.45) : 0);
  };
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
    for (let j = 0; j < placed.length; j++) {
      if (j === i) continue;
      const q = cur[j];
      const a = overlapArea(c.b, q.b);
      o += a;
      worst = Math.max(worst, a / Math.min(area(c.b), area(q.b)));
      if (segHits(placed[i].ax, placed[i].ay, c.x, c.y, q.b, 4 * s)) cross++;
      if (segHits(placed[j].ax, placed[j].ay, q.x, q.y, c.b, 4 * s)) cross++;
    }
    return o / (s * s) + 1.0 * L / s + 250 * cross + (worst > 0.45 ? 2e5 * (worst - 0.45) : 0);
  };
  const movable = placed.map((p, i) => i).filter((i) => placed[i].scored.length);
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

/* Earliest date first; if a card ends up stacked, also try latest first and keep the better. */
const countStacked = (pl) => pl.filter((p) => p.stacked).length;
function bestLayout(m, evs, s, label, rbs) {
  let best = null;
  for (const strict of [true, false]) {
    for (const list of [evs, [...evs].reverse()]) {
      const pl = layoutMonth(m, list, s, label, rbs, strict);
      if (!best || countStacked(pl) < countStacked(best)) best = pl;
      if (!countStacked(best)) return best;
      if (evs.length < 2) break;
    }
  }
  return best;
}
/* Lower is better: cards with no spot off the month name are the worst, then
   stacked cards, then how much the cards overlap, then leader length. */
function layoutCost(pl, label) {
  let k = 0;
  for (const p of pl) {
    if (p.noSpot) k += 1e8;
    if (p.stacked) k += 1e6;
    k += Math.hypot(p.cx - p.ax, p.cy - p.ay);
    for (const q of pl) if (q !== p) k += overlapArea(p.b, q.b) / 2;
  }
  return k + 2 * Math.hypot(label[0] + label[2] / 2 - C, label[1] + label[3] / 2 - C);   // name nearer the centre
}

function eventsByMonth() {
  const by = Array.from({ length: 12 }, () => []);
  for (const e of shownEvents()) by[e.month - 1].push(e);
  for (const list of by) list.sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  return by;
}

let labels = [];         // month label boxes, chosen at full size
let fullCards = [];      // card layout at full size

function computeFull() {
  const rbs = ribbons();
  syncCandCache(rbs);
  const by = eventsByMonth();
  labels = [];
  fullCards = [];
  for (let m = 0; m < 12; m++) {
    const all = labelCands(m, rbs);
    if (!by[m].length) { labels[m] = all[0]; continue; }
    // The name hugs the inner edge of the ring and the cards take the outside.
    // Only if the cards would then have no spot at all is the name moved outwards.
    const rc = (b) => Math.hypot(b[0] + b[2] / 2 - C, b[1] + b[3] / 2 - C);
    const r0 = Math.min(...all.map(rc));
    let best = null;
    for (const reach of [25, 60, 110, Infinity]) {
      const lc = all.filter((b) => rc(b) <= r0 + reach);
      best = null;
      for (let i = 0; i < lc.length; i++) {
        const pl = bestLayout(m, by[m], 1, lc[i], rbs);
        const cost = layoutCost(pl, lc[i]);
        if (!best || cost < best.cost) best = { cost, pl, lab: lc[i] };
      }
      if (best.cost < 1e8) break;
    }
    labels[m] = best.lab;
    fullCards.push(...best.pl);
  }
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

function boxFor(v) {
  if (v.t === 'full') return { ...FULL_BOX };
  const ptsList = [];
  if (v.t === 'season') {
    const mid = v.s * 90;
    ptsList.push([C, C]);
    for (let a = mid - 45; a <= mid + 45; a += 5) ptsList.push(pt(a, TODAY_OUT + 5));
  } else {
    for (let a = v.m * 30 - 15; a <= v.m * 30 + 15; a += 2.5) {
      ptsList.push(pt(a, R_MON0 - 6), pt(a, TODAY_OUT + 5));
    }
  }
  const xs = ptsList.map((p) => p[0]), ys = ptsList.map((p) => p[1]);
  const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10;
  const w = Math.max(...xs) + 10 - x0, h = Math.max(...ys) + 10 - y0;
  const side = Math.max(w, h);
  return { x: x0 - (side - w) / 2, y: y0 - (side - h) / 2, w: side, h: side };
}
const sameBox = (a, b) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.5);
function setVB(b) { svg.setAttribute('viewBox', `${f1(b.x)} ${f1(b.y)} ${f1(b.w)} ${f1(b.h)}`); }
const pxPerUnit = () => (svg.clientWidth || 360) / vb.w;
const cardScale = () => Math.min(1, CARD_PX / (17 * pxPerUnit()));

function viewMonths(v) {
  if (v.t === 'season') {
    const ms = [0, 1, 2, 3, 4].map((i) => mod(v.s * 3 - 2 + i, 12));
    return ms;
  }
  return [mod(v.m - 1, 12), v.m, mod(v.m + 1, 12)];
}

function computeViewLayout() {
  if (view.t === 'full') { viewCards = fullCards; return; }
  const s = cardScale();
  if (s >= 0.999) {
    viewCards = view.t === 'full' ? fullCards
      : fullCards.filter((c) => viewMonths(view).includes(c.m));
    return;
  }
  const rbs = ribbons();
  syncCandCache(rbs);
  const by = eventsByMonth();
  viewCards = [];
  for (const m of viewMonths(view)) {
    if (by[m].length) viewCards.push(...bestLayout(m, by[m], s, labels[m], rbs));
  }
}

function setView(v) {
  view = v;
  const target = boxFor(v);
  renderChrome();
  if (sameBox(target, vb)) {
    computeViewLayout();
    renderOverlay();
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
  setView((e.state && e.state.view) || { t: 'full' });
});

/* ---------------- rendering ---------------- */

function highlightedDays() {
  const hl = new Set();
  for (const e of shownEvents()) {
    if (!e.approx) hl.add(`${e.month - 1}-${clampDay(e.month - 1, e.day)}`);
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
    out.push(`<text class="mon" x="${f1(cx)}" y="${f1(y0 + 32)}">${MONTHS[m]}</text>` +
      `<text class="monpl" x="${f1(cx)}" y="${f1(y0 + 62)}">${MONTHS_PL[m]}</text>`);
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
    out.push(`<g data-period="${esc(rb.ev.id)}">` +
      `<path d="M${f1(xs)},${f1(ys)} A${R},${R} 0 ${big} 1 ${f1(xe)},${f1(ye)}" stroke="${col}" stroke-width="${RV_W}" fill="none" stroke-linecap="round"/>` +
      (label ? `<text class="vac" dy="${f1(size * 0.36)}" style="font-size:${size}px;letter-spacing:${f1(size * 0.08)}px"><textPath href="#rib${i}" startOffset="50%" text-anchor="middle">${esc(label)}</textPath></text>` : '') +
      `</g>`);
  });

  // day cells and numbers
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
      out.push(`<text class="dnum${isHl ? ' hl' : ''}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)})">${d}</text>`);
    }
  }

  // today: the cell grown 1.5× around its own centre, dark frame, same fill;
  // the number stays where it is, 1.5× larger
  {
    const { m, d } = today;
    const span = 30 / days[m], mid = cellStart(m, d) + span / 2, half = span * TODAY_SCALE / 2;
    const rMid = (R_DAY + R_OUT) / 2, rHalf = (R_OUT - R_DAY) * TODAY_SCALE / 2;
    const isHl = hl.has(`${m}-${d}`);
    const [x, y] = pt(mid, rMid);
    const rot = mod(mid, 360) < 180 ? mid - 90 : mid + 90;
    // the cell is so narrow that a rotated rounded rectangle matches the ring's curve
    const w = rMid * 2 * half * Math.PI / 180, h = 2 * rHalf;
    out.push(`<rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="6" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(mid)})" fill="${isHl ? HL_COL : DAY_COL[SEASON_OF[m]]}" stroke="#1d1d1f" stroke-width="3"/>`);
    out.push(`<text class="dnum now" fill="${isHl ? '#fff' : '#1d1d1f'}" style="fill:${isHl ? '#fff' : '#1d1d1f'}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)})">${d}</text>`);
  }

  baseG.innerHTML = `<defs>${defs.join('')}</defs>${out.join('')}`;
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
    out.push(`<line x1="${f1(c.ax)}" y1="${f1(c.ay)}" x2="${f1(c.cx)}" y2="${f1(c.cy)}" stroke="#6f6f6f" stroke-width="${(2.5 * c.s).toFixed(2)}" stroke-dasharray="${(6 * c.s).toFixed(2)} ${(6 * c.s).toFixed(2)}"/>`);
  }
  for (const c of cards) {
    const [x0, y0, w] = c.b;
    const k = c.s * CARD_K, bw = w / k;
    out.push(`<g class="card" data-id="${esc(c.ev.id)}" transform="translate(${f1(x0)},${f1(y0)}) scale(${k.toFixed(4)})">` +
      `<rect width="${f1(bw)}" height="${CARD_H}" rx="15" fill="#fff" stroke="${CARD_COL[SEASON_OF[c.m]]}" stroke-width="4" filter="url(#sh)"/>` +
      `<text class="emo" x="${f1(bw / 2)}" y="32">${esc(c.ev.icon)}</text>` +
      `<text class="ename" x="${f1(bw / 2)}" y="56">${esc(c.ev.title)}</text></g>`);
  }

  if (view.t === 'month' && view.sel) out.push(plusButton(view.sel));
  overlayG.innerHTML = out.join('');
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
    : view.t === 'season'
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

function tapCard(id) {
  const i = renderedOrder.findIndex((c) => c.ev.id === id);
  if (i < 0) return;
  const me = renderedOrder[i];
  const covered = renderedOrder.slice(i + 1).some((c) => overlapArea(c.b, me.b) > 0);
  if (covered) {
    raiseIds([id]);
    renderOverlay();
  } else {
    openMenu(id);
  }
}

function onTap(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (el && el.closest('[data-plus]')) { openForm(null, view.sel); return; }
  const card = el && el.closest('.card');
  if (card) { tapCard(card.dataset.id); return; }
  const band = el && el.closest('[data-period]');
  if (band) { openMenu(band.dataset.period); return; }

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

/* Single taps, double tap (back to the whole circle), pinch (same). */
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

svg.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    gesture = { x: e.clientX, y: e.clientY, t: performance.now(), tap: true, d0: 0 };
  } else if (gesture) {
    gesture.tap = false;
    const [p, q] = [...pointers.values()];
    gesture.d0 = Math.hypot(p.x - q.x, p.y - q.y);
  }
});
svg.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2 && gesture.d0 > 0) {
    const [p, q] = [...pointers.values()];
    if (Math.hypot(p.x - q.x, p.y - q.y) < gesture.d0 * 0.8) {
      gesture.d0 = 0;
      goFull();
    }
  } else if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 12) {
    gesture.tap = false;
  }
});
function pointerEnd(e) {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size > 0 || !gesture) return;
  const g = gesture;
  gesture = null;
  if (e.type === 'pointerup' && g.tap && performance.now() - g.t < 600) handleTap(e.clientX, e.clientY);
}
svg.addEventListener('pointerup', pointerEnd);
svg.addEventListener('pointercancel', pointerEnd);

$('back').addEventListener('click', goFull);

/* ---------------- menu: edit / delete ---------------- */

const menu = $('menu');
const formDlg = $('form');

function closeDialogs() {
  if (menu.open) menu.close();
  if (formDlg.open) formDlg.close();
}
for (const dlg of [menu, formDlg]) {
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

function describe(ev) {
  const start = dateText(ev.month - 1, ev.day);
  if (ev.kind === 'period') return `${start} — ${dateText(ev.endMonth - 1, ev.endDay)}` + (ev.year ? `, только ${ev.year}` : '');
  return (ev.approx ? 'примерно ' : '') + start + (ev.year ? `, только ${ev.year}` : ', каждый год');
}

function button(text, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (cls) b.className = cls;
  b.addEventListener('click', onClick);
  return b;
}

function openMenu(id) {
  const ev = items.find((e) => e.id === id);
  if (!ev) return;
  const head = $('menuHead'), actions = $('menuActions');
  head.innerHTML = `${esc(ev.icon)} ${esc(ev.title)}<small>${esc(describe(ev))}</small>`;
  const showMain = () => {
    actions.replaceChildren(
      button('Редактировать', 'primary', () => { menu.close(); openForm(ev); }),
      button('Удалить', '', showConfirm),
      button('Отмена', '', () => menu.close()),
    );
  };
  const showConfirm = () => {
    actions.replaceChildren(
      button(`Да, удалить «${ev.title}»`, 'danger', () => {
        items = items.filter((e) => e.id !== id);
        raised = raised.filter((r) => r !== id);
        saveItems();
        menu.close();
        rebuildAll();
      }),
      button('Не удалять', '', showMain),
    );
  };
  showMain();
  menu.showModal();
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
  F.approx.checked = !!(ev && ev.approx);
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
    approx: isPeriod ? false : F.approx.checked,
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
