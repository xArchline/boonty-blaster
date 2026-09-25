// Level landscapes: a calm top-down ground in the middle, scenery at the edges and in the letterbox bleed.
// Everything is deterministic (seeded RNG) and painted once into the renderer's cached background.

export interface Biome {
  id: string;
  name: string;
  ui: { top: string; bottom: string; accent: string };
  laneTint: string;
}

type Ctx = CanvasRenderingContext2D;
type Rng = () => number;

const TAU = Math.PI * 2;
const BLEED = 700;
/** Scenery only goes this far above the world: no real screen shape shows more. */
const TOPB = 320;

function rngFor(seed: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: Rng, a: T[]) => a[Math.floor(r() * a.length)];

// ---------- small drawing helpers ----------

function circle(g: Ctx, x: number, y: number, rad: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
}
function ellipse(g: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  g.fillStyle = fill;
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
}
function shadow(g: Ctx, x: number, y: number, rx: number, ry: number, a = 0.16) {
  ellipse(g, x, y, rx, ry, `rgba(20,24,50,${a})`);
}

function roundTree(g: Ctx, x: number, y: number, s: number, c: [string, string, string], trunk = '#8A5A3C') {
  shadow(g, x + 8 * s, y + 6 * s, 30 * s, 13 * s);
  g.fillStyle = trunk;
  g.beginPath(); g.roundRect(x - 5 * s, y - 14 * s, 10 * s, 20 * s, 4 * s); g.fill();
  circle(g, x, y - 26 * s, 27 * s, c[0]);
  circle(g, x - 14 * s, y - 20 * s, 16 * s, c[0]);
  circle(g, x + 14 * s, y - 20 * s, 16 * s, c[0]);
  circle(g, x - 3 * s, y - 30 * s, 22 * s, c[1]);
  circle(g, x - 12 * s, y - 24 * s, 12 * s, c[1]);
  circle(g, x - 9 * s, y - 38 * s, 9 * s, c[2]);
  circle(g, x + 6 * s, y - 42 * s, 5 * s, c[2]);
}

function bush(g: Ctx, x: number, y: number, s: number, c: [string, string, string], dots?: string) {
  shadow(g, x + 4 * s, y + 5 * s, 24 * s, 9 * s, 0.14);
  circle(g, x - 12 * s, y - 4 * s, 12 * s, c[0]);
  circle(g, x + 12 * s, y - 4 * s, 12 * s, c[0]);
  circle(g, x, y - 10 * s, 15 * s, c[0]);
  circle(g, x - 3 * s, y - 13 * s, 11 * s, c[1]);
  circle(g, x - 13 * s, y - 7 * s, 7 * s, c[1]);
  circle(g, x - 6 * s, y - 18 * s, 5 * s, c[2]);
  if (dots) for (const [dx, dy] of [[-10, -6], [6, -14], [12, -3], [-2, -2]]) circle(g, x + dx * s, y + dy * s, 2.6 * s, dots);
}

function flower(g: Ctx, x: number, y: number, s: number, petal: string, centre = '#FEE580') {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    circle(g, x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, 3.4 * s, petal);
  }
  circle(g, x, y, 2.6 * s, centre);
}

function rock(g: Ctx, x: number, y: number, s: number, base: string, light: string, dark = 'rgba(20,24,50,.18)') {
  shadow(g, x + 4 * s, y + 5 * s, 20 * s, 8 * s, 0.14);
  g.fillStyle = base;
  g.beginPath();
  g.moveTo(x - 18 * s, y + 3 * s);
  g.quadraticCurveTo(x - 20 * s, y - 12 * s, x - 6 * s, y - 16 * s);
  g.quadraticCurveTo(x + 10 * s, y - 20 * s, x + 17 * s, y - 6 * s);
  g.quadraticCurveTo(x + 22 * s, y + 5 * s, x + 8 * s, y + 6 * s);
  g.quadraticCurveTo(x - 6 * s, y + 8 * s, x - 18 * s, y + 3 * s);
  g.fill();
  ellipse(g, x + 4 * s, y + 2 * s, 12 * s, 3.5 * s, dark);
  ellipse(g, x - 4 * s, y - 10 * s, 9 * s, 4 * s, light, -0.3);
}

function pine(g: Ctx, x: number, y: number, s: number, dark: string, mid: string, snow: string | null) {
  shadow(g, x + 7 * s, y + 5 * s, 22 * s, 9 * s);
  g.fillStyle = '#7A5238';
  g.fillRect(x - 4 * s, y - 8 * s, 8 * s, 12 * s);
  g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const w = (24 - i * 6) * s, top = y - (30 + i * 16) * s, base = y - (4 + i * 16) * s;
    for (const [col, k] of [[dark, 1], [mid, 0.62]] as [string, number][]) {
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 5 * s;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + w * (k === 1 ? 1 : 0.1), base);
      g.lineTo(x - w * k, base);
      g.closePath(); g.fill(); g.stroke();
    }
    if (snow) {
      g.fillStyle = snow;
      g.beginPath();
      g.moveTo(x, top - 2 * s);
      g.lineTo(x + w * 0.42, top + (base - top) * 0.45);
      g.quadraticCurveTo(x, top + (base - top) * 0.3, x - w * 0.42, top + (base - top) * 0.45);
      g.closePath(); g.fill();
    }
  }
  g.lineJoin = 'miter';
}

function palm(g: Ctx, x: number, y: number, s: number, lean: number) {
  shadow(g, x + 16 * s + lean * 20 * s, y + 4 * s, 34 * s, 12 * s, 0.13);
  // trunk: a curved chain of rings
  const tx = x + lean * 26 * s, ty = y - 58 * s;
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    const px = x + lean * 26 * s * k * k, py = y - 58 * s * k;
    circle(g, px, py, (6.5 - k * 1.5) * s, i % 2 ? '#C99A62' : '#B5854F');
  }
  // fronds
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.95 + lean * 0.3;
    const L = 34 * s, ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.8 + 10 * s;
    const nx = -Math.sin(a) * 9 * s, ny = Math.cos(a) * 9 * s;
    const mx = (tx + ex) / 2, my = (ty + ey) / 2 - 6 * s;
    g.fillStyle = i % 2 ? '#3FAE5A' : '#2F9A4E';
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(mx + nx, my + ny, ex, ey);
    g.quadraticCurveTo(mx - nx, my - ny, tx, ty);
    g.fill();
  }
  circle(g, tx - 4 * s, ty + 3 * s, 4.5 * s, '#7A4E2C');
  circle(g, tx + 4 * s, ty + 4 * s, 4.5 * s, '#6A4226');
  circle(g, tx, ty - 1 * s, 6 * s, '#56C06A');
}

function cactus(g: Ctx, x: number, y: number, s: number) {
  shadow(g, x + 6 * s, y + 4 * s, 18 * s, 7 * s);
  const body = '#4FA86A', light = '#6FC486';
  g.fillStyle = body;
  g.beginPath(); g.roundRect(x - 8 * s, y - 50 * s, 16 * s, 54 * s, 8 * s); g.fill();
  g.lineCap = 'round'; g.strokeStyle = body; g.lineWidth = 10 * s;
  g.beginPath(); g.moveTo(x - 6 * s, y - 20 * s); g.lineTo(x - 18 * s, y - 20 * s); g.lineTo(x - 18 * s, y - 34 * s); g.stroke();
  g.beginPath(); g.moveTo(x + 6 * s, y - 28 * s); g.lineTo(x + 17 * s, y - 28 * s); g.lineTo(x + 17 * s, y - 40 * s); g.stroke();
  g.strokeStyle = light; g.lineWidth = 3 * s;
  g.beginPath(); g.moveTo(x - 2 * s, y - 44 * s); g.lineTo(x - 2 * s, y - 4 * s); g.stroke();
  g.lineCap = 'butt';
  flower(g, x, y - 50 * s, 0.7 * s, '#FF9EB5');
}

function arch(g: Ctx, x: number, y: number, s: number) {
  shadow(g, x + 8 * s, y + 3 * s, 42 * s, 9 * s);
  const w = 36 * s, h = 54 * s;
  // mesa block with an arched opening
  g.fillStyle = '#B85F42';
  g.beginPath(); g.roundRect(x - w, y - h, w * 2, h + 4 * s, [16 * s, 16 * s, 4 * s, 4 * s]); g.fill();
  g.fillStyle = '#CF7A56';
  g.beginPath(); g.roundRect(x - w, y - h, w * 2, h * 0.55, [16 * s, 16 * s, 6 * s, 6 * s]); g.fill();
  g.fillStyle = 'rgba(255,225,190,.35)';
  g.fillRect(x - w + 6 * s, y - h + 16 * s, w * 2 - 12 * s, 3 * s);
  g.fillRect(x - w + 4 * s, y - h + 30 * s, w * 2 - 8 * s, 2.5 * s);
  g.fillStyle = 'rgba(255,235,210,.55)';
  g.beginPath(); g.roundRect(x - w + 6 * s, y - h + 4 * s, w * 1.1, 6 * s, 3 * s); g.fill();
  // the opening shows sand in shade
  g.fillStyle = '#C99566';
  g.beginPath(); g.moveTo(x - 18 * s, y + 4 * s); g.lineTo(x - 18 * s, y - 16 * s); g.arc(x, y - 16 * s, 18 * s, Math.PI, 0); g.lineTo(x + 18 * s, y + 4 * s); g.closePath(); g.fill();
  g.fillStyle = 'rgba(90,40,20,.25)';
  g.beginPath(); g.arc(x, y - 16 * s, 18 * s, Math.PI, 0); g.lineTo(x + 18 * s, y - 8 * s); g.lineTo(x - 18 * s, y - 8 * s); g.fill();
}

function lollipop(g: Ctx, x: number, y: number, s: number, a: string, b: string) {
  shadow(g, x + 8 * s, y + 4 * s, 22 * s, 8 * s);
  g.fillStyle = '#FFF9F9';
  g.beginPath(); g.roundRect(x - 3 * s, y - 34 * s, 6 * s, 38 * s, 3 * s); g.fill();
  const cy = y - 50 * s;
  circle(g, x, cy, 22 * s, a);
  g.strokeStyle = b; g.lineWidth = 5 * s; g.lineCap = 'round';
  g.beginPath();
  for (let t = 0; t < 14; t += 0.2) {
    const rr = t * 1.45 * s;
    g.lineTo(x + Math.cos(t) * rr, cy + Math.sin(t) * rr);
  }
  g.stroke();
  g.lineCap = 'butt';
  ellipse(g, x - 9 * s, cy - 10 * s, 6 * s, 3.5 * s, 'rgba(255,255,255,.55)', -0.6);
}

function gumdrop(g: Ctx, x: number, y: number, s: number, c: string) {
  shadow(g, x + 3 * s, y + 3 * s, 12 * s, 5 * s);
  g.fillStyle = c;
  g.beginPath(); g.moveTo(x - 11 * s, y + 2 * s); g.quadraticCurveTo(x - 12 * s, y - 16 * s, x, y - 17 * s); g.quadraticCurveTo(x + 12 * s, y - 16 * s, x + 11 * s, y + 2 * s); g.closePath(); g.fill();
  ellipse(g, x - 4 * s, y - 10 * s, 3 * s, 4.5 * s, 'rgba(255,255,255,.55)', 0.3);
}

function mushroom(g: Ctx, x: number, y: number, s: number, cap: string) {
  const glow = g.createRadialGradient(x, y - 12 * s, 2 * s, x, y - 12 * s, 38 * s);
  glow.addColorStop(0, cap.replace(')', ',.45)').replace('rgb', 'rgba'));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.beginPath(); g.arc(x, y - 12 * s, 38 * s, 0, TAU); g.fill();
  g.fillStyle = '#E8E4D8';
  g.beginPath(); g.roundRect(x - 4 * s, y - 14 * s, 8 * s, 16 * s, 3 * s); g.fill();
  g.fillStyle = cap;
  g.beginPath(); g.ellipse(x, y - 14 * s, 15 * s, 11 * s, 0, Math.PI, TAU); g.closePath(); g.fill();
  circle(g, x - 6 * s, y - 19 * s, 2.2 * s, 'rgba(255,255,255,.8)');
  circle(g, x + 4 * s, y - 21 * s, 1.8 * s, 'rgba(255,255,255,.8)');
  circle(g, x + 8 * s, y - 16 * s, 1.5 * s, 'rgba(255,255,255,.8)');
}

function snowman(g: Ctx, x: number, y: number, s: number) {
  shadow(g, x + 5 * s, y + 4 * s, 18 * s, 7 * s);
  circle(g, x, y - 10 * s, 14 * s, '#F4F8FF');
  circle(g, x, y - 30 * s, 10 * s, '#FFFFFF');
  ellipse(g, x + 3 * s, y - 6 * s, 10 * s, 7 * s, 'rgba(120,150,200,.18)');
  circle(g, x - 3.5 * s, y - 32 * s, 1.6 * s, '#171C3B');
  circle(g, x + 3.5 * s, y - 32 * s, 1.6 * s, '#171C3B');
  g.fillStyle = '#FF7A63';
  g.beginPath(); g.moveTo(x, y - 29 * s); g.lineTo(x + 8 * s, y - 27 * s); g.lineTo(x, y - 26 * s); g.fill();
  g.fillStyle = '#E8604A';
  g.fillRect(x - 10 * s, y - 23 * s, 20 * s, 4 * s);
}

function leaf(g: Ctx, x: number, y: number, s: number, c: string, rot: number) {
  ellipse(g, x, y, 6 * s, 3 * s, c, rot);
}

// ---------- ground textures ----------

function stripes(g: Ctx, W: number, y0: number, y1: number, step: number, col: string) {
  g.fillStyle = col;
  for (let y = y0; y < y1; y += step * 2) g.fillRect(-BLEED, y, W + BLEED * 2, step);
}
function speckle(r: Rng, x0: number, x1: number, y0: number, y1: number, n: number, fn: (x: number, y: number) => void) {
  for (let i = 0; i < n; i++) fn(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0));
}
function ripples(g: Ctx, r: Rng, x0: number, x1: number, y0: number, y1: number, n: number, col: string, w: number) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), L = 20 + r() * 40;
    g.beginPath(); g.moveTo(x - L, y); g.quadraticCurveTo(x, y - 6, x + L, y); g.stroke();
  }
  g.lineCap = 'butt';
}

// ---------- player zones ----------

function planks(g: Ctx, W: number, top: number, bottom: number, r: Rng, c: [string, string, string]) {
  const h = 28;
  for (let y = top, row = 0; y < bottom; y += h, row++) {
    g.fillStyle = row % 2 ? c[0] : c[1];
    g.fillRect(-BLEED, y, W + BLEED * 2, h);
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(-BLEED, y + 2, W + BLEED * 2, 3);
    g.fillStyle = c[2];
    g.fillRect(-BLEED, y + h - 2, W + BLEED * 2, 2);
    let x = -BLEED + r() * 120;
    while (x < W + BLEED) {
      g.fillRect(x, y, 2, h - 2);
      circle(g, x + 7, y + 7, 1.6, c[2]);
      circle(g, x - 5, y + h - 8, 1.6, c[2]);
      x += 120 + r() * 110;
    }
  }
}

function cobbles(g: Ctx, W: number, top: number, bottom: number, r: Rng, grout: string, stones: string[], hi: string) {
  g.fillStyle = grout;
  g.fillRect(-BLEED, top, W + BLEED * 2, bottom - top);
  const h = 30, w = 44;
  for (let y = top + 2, row = 0; y < bottom; y += h, row++) {
    for (let x = -BLEED - (row % 2) * w / 2; x < W + BLEED; x += w) {
      const cw = w - 4 - r() * 3, ch = h - 4 - r() * 2;
      g.fillStyle = pick(r, stones);
      g.beginPath(); g.roundRect(x + 2, y + 1, cw, ch, 8); g.fill();
      g.fillStyle = hi;
      g.beginPath(); g.roundRect(x + 5, y + 3, cw - 12, 4, 2); g.fill();
    }
  }
}

function tiles(g: Ctx, W: number, top: number, bottom: number, a: string, b: string, line: string, size: number, bevel: boolean) {
  for (let y = top, row = 0; y < bottom; y += size, row++) {
    for (let x = -BLEED - ((BLEED) % size), col = 0; x < W + BLEED; x += size, col++) {
      g.fillStyle = (row + col) % 2 ? a : b;
      g.fillRect(x, y, size, size);
      if (bevel) {
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + 3, y + 3, size - 6, 4);
        g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x + 3, y + size - 7, size - 6, 4);
      }
    }
  }
  g.fillStyle = line;
  for (let y = top; y < bottom; y += size) g.fillRect(-BLEED, y, W + BLEED * 2, 2);
  for (let x = -BLEED - (BLEED % size); x < W + BLEED; x += size) g.fillRect(x, top, 2, bottom - top);
}

// ---------- biome looks ----------

interface Look {
  /** Ground everywhere (world + bleed) above the player zone, including the centre texture. */
  ground(g: Ctx, W: number, H: number, dangerY: number, r: Rng): void;
  /** Draw one decoration at (x, y) if this spot suits it (x, y are in the edge/bleed region). */
  decor(g: Ctx, x: number, y: number, r: Rng, W: number): void;
  /** The player's zone below the defence line. */
  zone(g: Ctx, W: number, H: number, top: number, r: Rng): void;
  line: string;
}

function field(g: Ctx, W: number, dangerY: number, outer: string, top: string, bottom: string, inset = 12) {
  g.fillStyle = outer;
  g.fillRect(-BLEED, -BLEED, W + BLEED * 2, dangerY + BLEED + 20);
  const f = g.createLinearGradient(0, 0, 0, dangerY);
  f.addColorStop(0, top); f.addColorStop(1, bottom);
  g.fillStyle = f;
  g.fillRect(inset, -BLEED, W - inset * 2, dangerY + BLEED + 20);
  // soft inner edge so the field reads as a lane
  for (const [x, dir] of [[inset, 1], [W - inset, -1]] as [number, number][]) {
    const e = g.createLinearGradient(x, 0, x + dir * 26, 0);
    e.addColorStop(0, 'rgba(20,24,50,.12)'); e.addColorStop(1, 'rgba(20,24,50,0)');
    g.fillStyle = e;
    g.fillRect(Math.min(x, x + dir * 26), -BLEED, 26, dangerY + BLEED + 20);
  }
}

const GREEN: [string, string, string] = ['#3E9E48', '#57B85A', '#7ED07A'];
const LOOKS: Record<string, Look> = {
  meadow: {
    line: '#FF7A63',
    ground(g, W, H, dangerY, r) {
      field(g, W, dangerY, '#78BE55', '#9CD66C', '#8DCB5F');
      g.save(); g.beginPath(); g.rect(12, -BLEED, W - 24, dangerY + BLEED); g.clip();
      stripes(g, W, -BLEED + 20, dangerY, 64, 'rgba(255,255,255,.07)');
      g.restore();
      g.strokeStyle = 'rgba(40,110,40,.16)'; g.lineWidth = 2; g.lineCap = 'round';
      speckle(r, 20, W - 20, -40, dangerY - 10, 70, (x, y) => {
        g.beginPath(); g.moveTo(x - 3, y - 4); g.lineTo(x, y); g.lineTo(x + 3, y - 5); g.stroke();
      });
      g.lineCap = 'butt';
      speckle(r, 30, W - 30, 0, dangerY - 20, 14, (x, y) => flower(g, x, y, 0.55, 'rgba(255,255,255,.28)', 'rgba(254,229,128,.35)'));
      // outer field: taller grass rows
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 700, (x, y) => {
        if (x > 8 && x < W - 8) return;
        ellipse(g, x, y, 10, 4, 'rgba(60,130,50,.18)');
      });
    },
    decor(g, x, y, r) {
      const k = r();
      if (k < 0.35) roundTree(g, x, y, 0.9 + r() * 0.35, GREEN);
      else if (k < 0.7) bush(g, x, y, 0.8 + r() * 0.4, GREEN, pick(r, ['#FF9EB5', '#FEE580', '#FFFFFF', '']) || undefined);
      else if (k < 0.9) for (let i = 0; i < 3; i++) flower(g, x + (r() - 0.5) * 40, y + (r() - 0.5) * 30, 0.9 + r() * 0.4, pick(r, ['#FFFFFF', '#FF9EB5', '#FEE580', '#4DC0FF']));
      else rock(g, x, y, 0.8, '#B8B4C8', '#D8D5E4');
    },
    zone(g, W, _H, top, r) { planks(g, W, top, top + BLEED + 200, r, ['#C98E5C', '#D39A66', '#9E6A40']); },
  },
  beach: {
    line: '#FF4A18',
    ground(g, W, H, dangerY, r) {
      // the sea along both sides, a sandy lane in the middle
      const sea = g.createLinearGradient(0, -BLEED, 0, H);
      sea.addColorStop(0, '#34B6E4'); sea.addColorStop(1, '#2AA2DA');
      g.fillStyle = sea;
      g.fillRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED);
      ripples(g, r, -BLEED, W + BLEED, -TOPB, H, 110, 'rgba(255,255,255,.28)', 3);
      const shore = (out: number) => {
        g.beginPath();
        for (let y = -BLEED; y <= H + 40; y += 24) g.lineTo(16 - out + Math.sin(y * 0.021) * 6, y);
        for (let y = H + 40; y >= -BLEED; y -= 24) g.lineTo(W - 16 + out + Math.sin(y * 0.017 + 2) * 6, y);
        g.closePath();
      };
      shore(18); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 8; g.stroke();
      shore(9); g.fillStyle = '#9EE3F2'; g.fill();
      shore(4); g.fillStyle = '#D2B070'; g.fill();
      const f = g.createLinearGradient(0, 0, 0, dangerY);
      f.addColorStop(0, '#EACB8C'); f.addColorStop(1, '#E3C282');
      shore(0); g.fillStyle = f; g.fill();
      ripples(g, r, 20, W - 20, -TOPB, dangerY - 10, 160, 'rgba(255,255,255,.2)', 2);
      ripples(g, r, 20, W - 20, -TOPB, dangerY - 10, 80, 'rgba(160,110,50,.1)', 2);
      speckle(r, 30, W - 30, 0, dangerY - 20, 10, (x, y) => ellipse(g, x, y, 4, 3, 'rgba(255,190,170,.35)'));
    },
    decor(g, x, y, r, W) {
      const onSand = x > 14 && x < W - 14;
      if (onSand) {
        const k = r();
        if (k < 0.45) palm(g, x, y, 0.9 + r() * 0.3, x < W / 2 ? -0.4 - r() * 0.4 : 0.4 + r() * 0.4);
        else if (k < 0.7) { ellipse(g, x, y, 7, 5, '#FFB3A6'); ellipse(g, x - 1, y - 1, 3, 2, '#FFE2DA'); }
        else if (k < 0.85) {
          g.fillStyle = '#FF7A63'; g.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 4 : 10; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          g.fill();
        } else rock(g, x, y, 0.7, '#B9B2A6', '#D8D2C8');
      } else if (r() < 0.2) {
        rock(g, x, y, 0.9 + r() * 0.5, '#6E8AA0', '#92AEC2');
      } else if (r() < 0.06) {
        // a swim ring bobbing
        g.lineWidth = 7; g.strokeStyle = '#FF7A63'; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.stroke();
        g.strokeStyle = '#FFF9F9'; g.setLineDash([9, 9.8]); g.beginPath(); g.arc(x, y, 12, 0, TAU); g.stroke(); g.setLineDash([]);
      }
    },
    zone(g, W, _H, top, r) { planks(g, W, top, top + BLEED + 200, r, ['#B98A63', '#C69770', '#8C6444']); },
  },
  autumn: {
    line: '#FEE580',
    ground(g, W, H, dangerY, r) {
      field(g, W, dangerY, '#6E7A45', '#8E9A5E', '#838F55');
      g.save(); g.beginPath(); g.rect(12, -BLEED, W - 24, dangerY + BLEED); g.clip();
      stripes(g, W, -BLEED + 20, dangerY, 64, 'rgba(255,255,255,.05)');
      g.restore();
      speckle(r, 20, W - 20, -20, dangerY - 10, 60, (x, y) => leaf(g, x, y, 0.9, pick(r, ['rgba(230,140,60,.28)', 'rgba(200,80,50,.24)', 'rgba(240,200,90,.28)']), r() * TAU));
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 800, (x, y) => {
        if (x > 8 && x < W - 8) return;
        leaf(g, x, y, 1.1, pick(r, ['#E8894A', '#D2573E', '#F1BE4A', '#B8463A']), r() * TAU);
      });
    },
    decor(g, x, y, r) {
      const k = r();
      const pal = pick(r, [['#C7462F', '#E0603E', '#F08A62'], ['#D9731F', '#EE9636', '#F8BC5C'], ['#D9A21F', '#EEC03C', '#FADB7A']]) as [string, string, string];
      if (k < 0.55) roundTree(g, x, y, 0.9 + r() * 0.35, pal, '#6E4630');
      else if (k < 0.8) bush(g, x, y, 0.8 + r() * 0.3, pal);
      else if (k < 0.92) mushroomPlain(g, x, y, r);
      else rock(g, x, y, 0.8, '#8C8579', '#ABA497');
    },
    zone(g, W, _H, top, r) { cobbles(g, W, top, top + BLEED + 200, r, '#6F625A', ['#A89A8C', '#9E8F81', '#B3A597'], 'rgba(255,255,255,.18)'); },
  },
  snow: {
    line: '#FF4A18',
    ground(g, W, H, dangerY, r) {
      field(g, W, dangerY, '#EAF1FA', '#C3D3E6', '#B8C9DF');
      g.save(); g.beginPath(); g.rect(12, -BLEED, W - 24, dangerY + BLEED); g.clip();
      stripes(g, W, -BLEED + 20, dangerY, 64, 'rgba(255,255,255,.08)');
      g.restore();
      speckle(r, 20, W - 20, -20, dangerY - 10, 26, (x, y) => ellipse(g, x, y, 30 + r() * 30, 8, 'rgba(255,255,255,.14)'));
      speckle(r, 20, W - 20, -20, dangerY - 10, 90, (x, y) => circle(g, x, y, 1.3, 'rgba(255,255,255,.7)'));
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 400, (x, y) => {
        if (x > 8 && x < W - 8) return;
        ellipse(g, x, y, 22 + r() * 20, 7, 'rgba(150,180,215,.18)');
      });
    },
    decor(g, x, y, r) {
      const k = r();
      if (k < 0.6) pine(g, x, y, 0.85 + r() * 0.4, '#2E7A6A', '#3F9A80', '#F4F8FF');
      else if (k < 0.7) snowman(g, x, y, 0.9);
      else if (k < 0.85) {
        g.fillStyle = 'rgba(150,210,240,.8)';
        g.beginPath(); g.ellipse(x, y, 30, 12, 0, 0, TAU); g.fill();
        ellipse(g, x - 8, y - 3, 12, 3, 'rgba(255,255,255,.7)', -0.1);
      } else rock(g, x, y, 0.8, '#9BA7B8', '#F4F8FF');
    },
    zone(g, W, _H, top) {
      const z = g.createLinearGradient(0, top, 0, top + 200);
      z.addColorStop(0, '#7FB9E2'); z.addColorStop(1, '#5D9BD0');
      g.fillStyle = z; g.fillRect(-BLEED, top, W + BLEED * 2, BLEED + 200);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-BLEED, top, W + BLEED * 2, 6);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
      for (let x = -BLEED; x < W + BLEED; x += 90) {
        g.beginPath(); g.moveTo(x, top + 10); g.lineTo(x + 20, top + 40); g.lineTo(x + 8, top + 70); g.lineTo(x + 30, top + 110); g.lineTo(x + 18, top + 160); g.stroke();
        g.beginPath(); g.moveTo(x + 20, top + 40); g.lineTo(x + 52, top + 55); g.stroke();
      }
      for (let x = -BLEED + 30; x < W + BLEED; x += 140) ellipse(g, x, top + 30, 26, 5, 'rgba(255,255,255,.22)', -0.3);
    },
  },
  desert: {
    line: '#FF4A18',
    ground(g, W, H, dangerY, r) {
      field(g, W, dangerY, '#E3B27C', '#D2B08F', '#C8A585');
      ripples(g, r, 20, W - 20, -TOPB, dangerY - 10, 130, 'rgba(140,95,50,.1)', 2.5);
      ripples(g, r, 20, W - 20, -TOPB, dangerY - 10, 70, 'rgba(255,255,255,.14)', 2);
      // dunes out in the bleed
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 80, (x, y) => {
        if (x > -40 && x < W + 40) return;
        ellipse(g, x, y, 70 + r() * 50, 22, 'rgba(255,225,170,.5)');
        ellipse(g, x + 10, y + 12, 70, 12, 'rgba(180,110,60,.18)');
      });
    },
    decor(g, x, y, r) {
      const k = r();
      if (k < 0.4) cactus(g, x, y, 0.8 + r() * 0.35);
      else if (k < 0.55) arch(g, x, y, 0.8 + r() * 0.3);
      else if (k < 0.85) rock(g, x, y, 0.7 + r() * 0.5, '#C4704F', '#DE9270');
      else { circle(g, x, y, 3, 'rgba(120,80,50,.3)'); circle(g, x + 9, y + 4, 2, 'rgba(120,80,50,.3)'); }
    },
    zone(g, W, _H, top) { tiles(g, W, top, top + BLEED + 200, '#B7845A', '#C29066', '#8E6040', 46, true); },
  },
  candy: {
    line: '#FF4A18',
    ground(g, W, H, dangerY, r) {
      field(g, W, dangerY, '#FFE08A', '#F3A9C3', '#EC9CB8');
      g.save(); g.beginPath(); g.rect(12, -BLEED, W - 24, dangerY + BLEED); g.clip();
      stripes(g, W, -BLEED + 20, dangerY, 64, 'rgba(255,255,255,.09)');
      g.restore();
      g.lineCap = 'round'; g.lineWidth = 3;
      speckle(r, 20, W - 20, -20, dangerY - 10, 80, (x, y) => {
        g.strokeStyle = pick(r, ['rgba(255,255,255,.3)', 'rgba(254,229,128,.35)', 'rgba(77,192,255,.22)']);
        const a = r() * Math.PI;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke();
      });
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 500, (x, y) => {
        if (x > 8 && x < W - 8) return;
        g.strokeStyle = pick(r, ['#FF9EB5', '#4DC0FF', '#FFFFFF', '#B5E8A0']);
        const a = r() * Math.PI;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke();
      });
      g.lineCap = 'butt';
    },
    decor(g, x, y, r) {
      const k = r();
      if (k < 0.5) lollipop(g, x, y, 0.8 + r() * 0.4, pick(r, ['#FF9EB5', '#FFD45C', '#8FD6FF', '#B8E986']), '#FFF9F9');
      else if (k < 0.85) gumdrop(g, x, y, 0.9 + r() * 0.4, pick(r, ['#FF7EA6', '#FFB347', '#7FD8B0', '#9FB2FF']));
      else {
        // candy cane
        g.lineCap = 'round'; g.lineWidth = 7;
        for (const [col, dash] of [['#FFF9F9', []], ['#FF4A6A', [6, 6]]] as [string, number[]][]) {
          g.strokeStyle = col; g.setLineDash(dash);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 36); g.arc(x + 9, y - 36, 9, Math.PI, 0); g.stroke();
        }
        g.setLineDash([]); g.lineCap = 'butt';
      }
    },
    zone(g, W, _H, top) { tiles(g, W, top, top + BLEED + 200, '#7A4834', '#80503A', '#5A3224', 50, true); },
  },
  night: {
    line: '#FEE580',
    ground(g, W, H, dangerY, r) {
      field(g, W, dangerY, '#223A4E', '#335770', '#2D4F68');
      g.save(); g.beginPath(); g.rect(12, -BLEED, W - 24, dangerY + BLEED); g.clip();
      stripes(g, W, -BLEED + 20, dangerY, 64, 'rgba(255,255,255,.035)');
      g.restore();
      speckle(r, 20, W - 20, -20, dangerY - 10, 40, (x, y) => circle(g, x, y, 1.5, 'rgba(254,229,128,.35)'));
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 200, (x, y) => {
        if (x > 8 && x < W - 8) return;
        circle(g, x, y, 7, 'rgba(254,229,128,.14)');
        circle(g, x, y, 3.5, 'rgba(254,229,128,.35)');
        circle(g, x, y, 1.6, '#FFF3B8');
      });
    },
    decor(g, x, y, r) {
      const k = r();
      if (k < 0.35) mushroom(g, x, y, 0.9 + r() * 0.5, pick(r, ['rgb(120,200,255)', 'rgb(255,140,190)', 'rgb(180,150,255)']));
      else if (k < 0.75) bush(g, x, y, 0.9 + r() * 0.3, ['#1E4D4A', '#2A6660', '#3C8078'], pick(r, ['#9FE0FF', '#FFB3D0', '#FEE580']));
      else if (k < 0.9) roundTree(g, x, y, 1, ['#1B4442', '#265B57', '#357570'], '#3A2E3A');
      else rock(g, x, y, 0.8, '#4A5A70', '#61728A');
    },
    zone(g, W, _H, top, r) { cobbles(g, W, top, top + BLEED + 200, r, '#1C2638', ['#465672', '#3E4D68', '#4E5F7C'], 'rgba(255,255,255,.12)'); },
  },
  lava: {
    line: '#FEE580',
    ground(g, W, H, dangerY, r) {
      const lava = g.createLinearGradient(0, -BLEED, 0, H);
      lava.addColorStop(0, '#E0542A'); lava.addColorStop(1, '#C8401F');
      g.fillStyle = lava; g.fillRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED);
      speckle(r, -BLEED, W + BLEED, -TOPB, H, 180, (x, y) => ellipse(g, x, y, 14 + r() * 20, 5 + r() * 5, 'rgba(255,220,90,.45)'));
      // rocky shelf around the lane
      g.fillStyle = '#3A2A33';
      g.beginPath(); g.roundRect(-60, -BLEED, W + 120, dangerY + BLEED + 30, 40); g.fill();
      field(g, W, dangerY, 'rgba(0,0,0,0)', '#5E4C58', '#554450');
      g.strokeStyle = 'rgba(255,120,60,.16)'; g.lineWidth = 2;
      speckle(r, 30, W - 30, -20, dangerY - 20, 18, (x, y) => {
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y + 8); g.lineTo(x + 8, y + 20); g.lineTo(x + 20, y + 28); g.stroke();
      });
      speckle(r, 20, W - 20, -20, dangerY - 10, 40, (x, y) => circle(g, x, y, 3, 'rgba(0,0,0,.12)'));
    },
    decor(g, x, y, r, W) {
      const onRock = x > -55 && x < W + 55;
      if (onRock) {
        if (r() < 0.6) rock(g, x, y, 0.8 + r() * 0.4, '#2A1E26', '#4A3A44');
        else { circle(g, x, y, 5, '#FF7A2A'); circle(g, x, y, 2.5, '#FEE580'); }
      } else if (r() < 0.25) rock(g, x, y, 1 + r() * 0.6, '#2A1E26', '#4A3A44');
    },
    zone(g, W, _H, top, r) {
      cobbles(g, W, top, top + BLEED + 200, r, '#5A2A26', ['#2E232B', '#342830', '#281E26'], 'rgba(255,255,255,.07)');
    },
  },
};

function mushroomPlain(g: Ctx, x: number, y: number, r: Rng) {
  for (let i = 0; i < 2; i++) {
    const mx = x + i * 14 - 6, my = y + i * 4, s = 0.7 + r() * 0.3;
    g.fillStyle = '#F4EAD8'; g.fillRect(mx - 3 * s, my - 12 * s, 6 * s, 12 * s);
    g.fillStyle = '#D2463A';
    g.beginPath(); g.ellipse(mx, my - 12 * s, 11 * s, 8 * s, 0, Math.PI, TAU); g.closePath(); g.fill();
    circle(g, mx - 4 * s, my - 15 * s, 1.8 * s, '#FFF9F9');
    circle(g, mx + 4 * s, my - 16 * s, 1.5 * s, '#FFF9F9');
  }
}

// ---------- public API ----------

export const BIOMES: Biome[] = [
  { id: 'meadow', name: 'Sunny Meadow', ui: { top: '#4FB6EA', bottom: '#3F9E4E', accent: '#FEE580' }, laneTint: '' },
  { id: 'beach', name: 'Sandy Beach', ui: { top: '#2FB2E6', bottom: '#1C7FC0', accent: '#FEE580' }, laneTint: '' },
  { id: 'autumn', name: 'Autumn Forest', ui: { top: '#E07A3C', bottom: '#8A3A2C', accent: '#FEE580' }, laneTint: '' },
  { id: 'snow', name: 'Snowy Hills', ui: { top: '#6AB0E6', bottom: '#3A5CA6', accent: '#FEE580' }, laneTint: 'rgba(40,70,120,0.04)' },
  { id: 'desert', name: 'Desert Canyon', ui: { top: '#EE9A52', bottom: '#A8452F', accent: '#FEE580' }, laneTint: '' },
  { id: 'candy', name: 'Candy Sunset', ui: { top: '#F2679F', bottom: '#F58C4E', accent: '#FFF3B8' }, laneTint: '' },
  { id: 'night', name: 'Firefly Garden', ui: { top: '#1C2A56', bottom: '#2F6468', accent: '#FEE580' }, laneTint: '' },
  { id: 'lava', name: 'Lava Peaks', ui: { top: '#35192A', bottom: '#B83A26', accent: '#FEE580' }, laneTint: '' },
];

export function biomeFor(level: number): Biome {
  const i = Math.floor((Math.max(1, Math.floor(level)) - 1) / 5);
  return BIOMES[i % BIOMES.length];
}

/** Paint the whole static background in WORLD coordinates (caller applied the world transform). */
export function paintBiome(g: CanvasRenderingContext2D, b: Biome, W: number, H: number, dangerY: number): void {
  const look = LOOKS[b.id] ?? LOOKS.meadow;
  const r = rngFor(b.id);
  g.save();
  look.ground(g, W, H, dangerY, r);

  // scenery: a jittered grid over the edges and the bleed, drawn back to front
  const spots: [number, number][] = [];
  const step = 62;
  for (let y = -TOPB; y < dangerY + 20; y += step) {
    for (let x = -BLEED; x < W + BLEED; x += step) {
      const px = x + r() * step * 0.8, py = y + r() * step * 0.8;
      const inLane = px > 44 && px < W - 44 && py > 18;
      if (inLane || py > dangerY - 8) continue;
      if (px > 12 && px < W - 12 && py > -30) {
        // the thin strip inside the lane edge / just above the world: keep it light
        if (r() < 0.35) continue;
      }
      spots.push([px, py]);
    }
  }
  spots.sort((a, c) => a[1] - c[1]);
  for (const [x, y] of spots) look.decor(g, x, y, r, W);

  // the player's zone and the defence line
  const top = dangerY + 14;
  g.save();
  g.beginPath(); g.rect(-BLEED, top, W + BLEED * 2, H + BLEED); g.clip();
  look.zone(g, W, H, top, r);
  const sh = g.createLinearGradient(0, top, 0, top + 18);
  sh.addColorStop(0, 'rgba(20,24,50,.28)'); sh.addColorStop(1, 'rgba(20,24,50,0)');
  g.fillStyle = sh; g.fillRect(-BLEED, top, W + BLEED * 2, 18);
  g.restore();

  g.lineCap = 'round';
  g.strokeStyle = 'rgba(23,28,59,.35)'; g.lineWidth = 9;
  g.beginPath(); g.moveTo(-BLEED, dangerY + 12); g.lineTo(W + BLEED, dangerY + 12); g.stroke();
  g.strokeStyle = look.line; g.lineWidth = 5; g.setLineDash([16, 12]);
  g.beginPath(); g.moveTo(-BLEED, dangerY + 12); g.lineTo(W + BLEED, dangerY + 12); g.stroke();
  g.setLineDash([]);
  g.lineCap = 'butt';
  g.restore();
}
