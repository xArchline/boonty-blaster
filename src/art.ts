// Vector art in the Boonty style: white fluffy hedgehog heroes vs. orange Grumps.
export const C = {
  lav100: '#DADFFF', lav200: '#B5BEFF', lav500: '#6173EB', lav900: '#3817AF',
  yel100: '#FFF0B5', yel200: '#FEE580', yel500: '#F1BE00', yel900: '#CA8001',
  blue500: '#4DC0FF', blue900: '#28ABF1',
  or200: '#FFB3A6', or500: '#FF7A63', or900: '#FF4A18',
  ink: '#171C3B', white: '#FFF9F9', pink: '#FF9EB5',
};

type Ctx = CanvasRenderingContext2D;

export type Hat = 'helmet' | 'balloon' | 'crown' | 'shades';

export function hedgehog(g: Ctx, r: number, o: { blink?: boolean; happy?: boolean; gold?: boolean; hat?: Hat } = {}) {
  if (o.hat === 'balloon') balloon(g, r * 0.95, -r * 1.55, r * 0.5, C.blue500);
  // spikes: a fluffy crown behind the body (golden during King Boonty's super)
  g.fillStyle = o.gold ? C.yel200 : '#ECE9F8';
  g.strokeStyle = o.gold ? C.yel500 : '#C9C3EA';
  g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath();
  const n = 13;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (1.05 + (i / n) * 0.9);
    const a2 = Math.PI * (1.05 + ((i + 0.5) / n) * 0.9);
    g.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95 - r * 0.05);
    if (i < n) g.lineTo(Math.cos(a2) * r * 1.2, Math.sin(a2) * r * 1.2 - r * 0.05);
  }
  g.closePath();
  g.fill();
  g.stroke();

  // ears
  for (const s of [-1, 1]) {
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(s * r * 0.58, -r * 0.7, r * 0.22, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#FFC2CF';
    g.beginPath(); g.arc(s * r * 0.58, -r * 0.68, r * 0.12, 0, Math.PI * 2); g.fill();
  }

  // body
  const grad = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.7, '#F7F5FD');
  grad.addColorStop(1, '#DCD7F2');
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.95, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#C9C3EA'; g.stroke();

  // feet
  g.fillStyle = '#FFC2CF';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.36, r * 0.9, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); g.fill(); }

  // face
  g.fillStyle = C.ink;
  for (const s of [-1, 1]) {
    if (o.blink || o.happy) {
      g.strokeStyle = C.ink; g.lineWidth = r * 0.08; g.lineCap = 'round';
      g.beginPath(); g.arc(s * r * 0.3, -r * 0.02, r * 0.11, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
      g.beginPath(); g.ellipse(s * r * 0.3, -r * 0.05, r * 0.13, r * 0.16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(s * r * 0.3 + r * 0.05, -r * 0.11, r * 0.05, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.ink;
    }
  }
  g.fillStyle = 'rgba(255,140,170,.45)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.52, r * 0.18, r * 0.13, r * 0.08, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = C.pink;
  g.beginPath(); g.ellipse(0, r * 0.13, r * 0.09, r * 0.065, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = C.ink; g.lineWidth = Math.max(1, r * 0.06); g.lineCap = 'round';
  g.beginPath(); g.arc(0, r * 0.2, r * 0.13, 0.25, Math.PI - 0.25); g.stroke();

  if (o.hat === 'helmet') {
    // round knight helmet with a visor band and a plume
    g.fillStyle = C.or500;
    g.beginPath(); g.ellipse(r * 0.1, -r * 1.12, r * 0.14, r * 0.3, 0.3, 0, Math.PI * 2); g.fill();
    const hg = g.createLinearGradient(0, -r, 0, -r * 0.2);
    hg.addColorStop(0, '#F4F5FA'); hg.addColorStop(1, '#A9AFC8');
    g.fillStyle = hg; g.strokeStyle = '#6B7194'; g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath(); g.arc(0, -r * 0.3, r * 0.78, Math.PI * 1.08, Math.PI * 1.92); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#6B7194';
    g.fillRect(-r * 0.7, -r * 0.42, r * 1.4, r * 0.1);
  } else if (o.hat === 'shades') {
    g.fillStyle = C.ink; g.strokeStyle = C.ink; g.lineWidth = Math.max(1, r * 0.06);
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.3, -r * 0.05, r * 0.22, r * 0.17, 0, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(-r * 0.1, -r * 0.08); g.lineTo(r * 0.1, -r * 0.08); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.3 - r * 0.07, -r * 0.1, r * 0.06, r * 0.04, -0.5, 0, Math.PI * 2); g.fill(); }
  } else if (o.hat === 'crown') {
    g.fillStyle = C.yel500; g.strokeStyle = C.yel900; g.lineWidth = Math.max(1, r * 0.05); g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-r * 0.45, -r * 0.72); g.lineTo(-r * 0.52, -r * 1.2); g.lineTo(-r * 0.24, -r * 0.95);
    g.lineTo(0, -r * 1.3); g.lineTo(r * 0.24, -r * 0.95); g.lineTo(r * 0.52, -r * 1.2); g.lineTo(r * 0.45, -r * 0.72);
    g.closePath(); g.fill(); g.stroke();
  }
}

export function balloon(g: Ctx, x: number, y: number, r: number, color: string) {
  g.strokeStyle = 'rgba(23,28,59,.5)'; g.lineWidth = Math.max(1, r * 0.08);
  g.beginPath(); g.moveTo(x, y + r * 1.1); g.quadraticCurveTo(x - r * 0.4, y + r * 1.8, x - r * 0.9, y + r * 2.6); g.stroke();
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  grad.addColorStop(0, '#fff'); grad.addColorStop(0.35, color); grad.addColorStop(1, color);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(x, y, r * 0.9, r * 1.1, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = color;
  g.beginPath(); g.moveTo(x - r * 0.18, y + r * 1.2); g.lineTo(x + r * 0.18, y + r * 1.2); g.lineTo(x, y + r * 1.0); g.fill();
}

// Body colours per Grump type: the orange family, plus new colours for the later types.
const SKIN: Record<string, [string, string, string, string]> = {
  // highlight, base, edge, outline
  orange: [C.or200, C.or500, '#E0553C', '#A8300F'],
  red: [C.or200, C.or900, '#B8330C', '#A8300F'],
  iron: ['#9AA3D6', '#51588F', '#2E3463', '#1E2350'],
  thief: ['#B5A4FF', '#6A4BE0', '#3817AF', '#24107A'],
  healer: ['#C8F5D8', '#3CCB7F', '#1E9A5A', '#11703F'],
};

export function grump(g: Ctx, r: number, kind: 'grump' | 'big' | 'zippy' | 'king' | 'splitter' | 'shield' | 'thief' | 'healer') {
  const big = kind === 'big' || kind === 'king';
  const skin = SKIN[kind === 'shield' ? 'iron' : kind === 'thief' ? 'thief' : kind === 'healer' ? 'healer' : big ? 'red' : 'orange'];
  // flame tuft (lightning-yellow on Zippies)
  g.fillStyle = kind === 'zippy' ? C.yel500 : kind === 'healer' ? '#1E9A5A' : kind === 'thief' ? C.ink : big ? '#C7300A' : C.or900;
  g.beginPath();
  g.moveTo(-r * 0.45, -r * 0.7);
  g.quadraticCurveTo(-r * 0.35, -r * 1.3, -r * 0.1, -r * 0.85);
  g.quadraticCurveTo(0, -r * 1.45, r * 0.15, -r * 0.85);
  g.quadraticCurveTo(r * 0.4, -r * 1.25, r * 0.45, -r * 0.7);
  g.closePath();
  g.fill();

  const grad = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  grad.addColorStop(0, skin[0]);
  grad.addColorStop(0.55, skin[1]);
  grad.addColorStop(1, skin[2]);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = skin[3]; g.lineWidth = Math.max(1, r * 0.07); g.stroke();
  if (kind === 'thief') {
    // bandit mask across the eyes
    g.fillStyle = C.ink;
    g.beginPath(); g.roundRect(-r * 0.78, -r * 0.2, r * 1.56, r * 0.36, r * 0.18); g.fill();
  }

  for (const s of [-1, 1]) {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(s * r * 0.3, -r * 0.02, r * 0.19, r * 0.17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.ink;
    g.beginPath(); g.arc(s * r * 0.26, r * 0.02, r * 0.1, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = r * 0.11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s * r * 0.55, -r * 0.35); g.lineTo(s * r * 0.12, -r * 0.2); g.stroke();
  }
  g.lineWidth = r * 0.08;
  g.beginPath(); g.arc(0, r * 0.52, r * 0.17, Math.PI + 0.4, -0.4); g.stroke();

  if (kind === 'healer') {
    // white medic cross on the belly
    g.fillStyle = '#fff';
    g.fillRect(-r * 0.09, r * 0.5, r * 0.18, r * 0.4);
    g.fillRect(-r * 0.2, r * 0.61, r * 0.4, r * 0.18);
  }
  if (kind === 'splitter') {
    // stitched seam + three little faces-to-be: it will split into three
    g.strokeStyle = C.ink; g.lineWidth = r * 0.07; g.setLineDash([r * 0.12, r * 0.1]);
    g.beginPath(); g.moveTo(0, -r * 0.9); g.lineTo(0, -r * 0.4); g.stroke();
    g.beginPath(); g.moveTo(0, r * 0.75); g.lineTo(0, r * 0.92); g.stroke();
    g.setLineDash([]);
    g.fillStyle = C.yel200;
    for (const dx of [-0.35, 0, 0.35]) { g.beginPath(); g.arc(dx * r, r * 0.78, r * 0.08, 0, Math.PI * 2); g.fill(); }
  }
  if (kind === 'king') {
    g.fillStyle = C.yel500; g.strokeStyle = C.yel900; g.lineWidth = r * 0.06; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-r * 0.55, -r * 0.62);
    g.lineTo(-r * 0.62, -r * 1.2); g.lineTo(-r * 0.3, -r * 0.92);
    g.lineTo(0, -r * 1.35); g.lineTo(r * 0.3, -r * 0.92);
    g.lineTo(r * 0.62, -r * 1.2); g.lineTo(r * 0.55, -r * 0.62);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.blue500;
    g.beginPath(); g.arc(0, -r * 0.82, r * 0.09, 0, Math.PI * 2); g.fill();
  }
}

/** Pre-renders a drawing into an offscreen canvas at the current pixel scale. */
const cache = new Map<string, HTMLCanvasElement>();
export const clearSprites = () => cache.clear();
export function sprite(key: string, r: number, px: number, draw: (g: Ctx, r: number) => void) {
  const id = `${key}:${r}:${px}`;
  let c = cache.get(id);
  if (!c) {
    const pad = r * 1.5;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(pad * 2 * px);
    const g = c.getContext('2d')!;
    g.scale(px, px);
    g.translate(pad, pad);
    draw(g, r);
    cache.set(id, c);
  }
  return c;
}
