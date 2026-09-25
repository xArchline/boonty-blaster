import { balloon, C, clearSprites, grump, hedgehog, sprite, type Hat } from './art';
import { biomeFor, paintBiome } from './biomes';
import { CANNON_Y, DANGER_Y, H, MINI_R, W, type Hero, type State } from './sim';

const HAT: Record<Hero, Hat> = { knight: 'helmet', party: 'balloon', crown: 'crown', cool: 'shades' };
/** The super button, in world coordinates (main.ts hit-tests it). */
export const SUPER_BTN = { x: 478, y: 892, r: 46 };
const SUPER_NAME: Record<Hero, string> = { knight: 'CHARGE!', party: 'PARTY TIME!', crown: 'GOLDEN RUSH!', cool: 'FREEZE!' };

type Ctx = CanvasRenderingContext2D;
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number; text?: string; spin?: number; home?: boolean; ring?: boolean }

const FONT = '"Delight", "Arial Rounded MT Bold", system-ui, sans-serif';

export class Renderer {
  g: Ctx;
  px = 1; // device pixels per world unit
  scale = 1;
  ox = 0;
  oy = 0;
  parts: Particle[] = [];
  shake = 0;
  heartFlash = 0;
  showHint = false;
  banner: { text: string; sub: string; t: number; color: string } | null = null;
  t = 0;
  flash = 0; // white screen flash
  slow = 0; // seconds of slow motion left (main.ts scales time while > 0)
  private bg: HTMLCanvasElement | null = null;
  private bgId = '';
  private portraits: Partial<Record<Hero, HTMLImageElement>> = {};

  private portrait(hero: Hero) {
    let img = this.portraits[hero];
    if (!img) {
      img = new Image();
      img.src = `assets/boonty-${hero}.webp`;
      this.portraits[hero] = img;
    }
    return img;
  }

  constructor(public canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.scale = Math.min(w / W, h / H);
    this.ox = (w - W * this.scale) / 2;
    this.oy = (h - H * this.scale) / 2;
    this.px = this.scale * dpr;
    this.bg = null;
    clearSprites();
  }

  /** Screen (CSS px) to world coordinates. */
  toWorld(x: number, y: number) {
    return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale };
  }

  consume(s: State) {
    for (const e of s.events) {
      if (e.type === 'pop' || e.type === 'bigPop' || e.type === 'bossDown') {
        const n = e.type === 'pop' ? 1 : e.type === 'bigPop' ? 4 : 10;
        for (let i = 0; i < n; i++) this.parts.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 300, vy: -100 - Math.random() * 150, life: 0.8, max: 0.8, color: C.yel500, r: 6, home: true });
      }
      if (e.type === 'pop' || e.type === 'bigPop') {
        const big = e.type === 'bigPop';
        this.burst(e.x, e.y, big ? 22 : 8, [C.or500, C.or200, C.yel200, '#fff'], big ? 260 : 170);
        if (big) this.shake = Math.min(14, this.shake + 8);
      } else if (e.type === 'castleHit') {
        if (Math.random() < 0.35) this.burst(e.x, e.y, 2, [C.yel200, '#fff'], 120);
        this.shake = Math.min(6, this.shake + 0.6);
      } else if (e.type === 'gate') {
        this.parts.push({ x: e.x, y: e.y - 26, vx: 0, vy: -70, life: 0.7, max: 0.7, color: '#fff', r: 22, text: '×' + e.value });
      } else if (e.type === 'heart') {
        this.heartFlash = 1;
        this.shake = Math.min(16, this.shake + 12);
        this.burst(e.x, e.y, 14, [C.or900, C.or500], 220);
      } else if (e.type === 'trap') {
        this.burst(e.x, e.y, 3, ['#9AA0C8', '#fff'], 90);
      } else if (e.type === 'rush') {
        this.say('RUSH!', 'Sweep left and right!', C.or900);
      } else if (e.type === 'boss') {
        this.say('KING GRUMP!', 'If he crosses, you lose!', C.or900);
        this.shake = 14;
      } else if (e.type === 'bossDown') {
        this.burst(e.x, e.y, 90, [C.yel500, C.or500, '#fff', C.lav500], 480, true);
        this.ring(e.x, e.y, C.yel200, 260);
        this.say('KING DOWN!', '', C.yel500);
        this.shake = 24;
        this.flash = 1;
        this.slow = 1.3;
      } else if (e.type === 'super') {
        this.flash = 0.8;
        this.shake = 16;
        this.ring(e.x, e.y, '#fff', 200);
        this.say(SUPER_NAME[s.hero], '', C.yel500);
        if (s.hero === 'cool') this.burst(W / 2, 450, 60, ['#fff', C.blue500, '#BFE9FF'], 520, true);
      } else if (e.type === 'superReady') {
        this.parts.push({ x: SUPER_BTN.x - 20, y: SUPER_BTN.y - 70, vx: 0, vy: -40, life: 1.2, max: 1.2, color: C.yel200, r: 22, text: 'SUPER READY!' });
      } else if (e.type === 'blast') {
        this.ring(e.x, e.y, C.yel200, 120);
        this.burst(e.x, e.y, 26, [C.blue500, C.yel500, C.or500, '#fff', C.lav500], 320, true);
        this.shake = Math.min(20, this.shake + 10);
      } else if (e.type === 'rollerHit') {
        this.burst(e.x, e.y, 10, ['#DDE0EE', '#fff', C.or500], 260);
      } else if (e.type === 'shield') {
        this.ring(e.x, e.y, C.yel500, 120);
        this.shake = Math.min(12, this.shake + 6);
      } else if (e.type === 'shieldHit') {
        if (Math.random() < 0.4) this.burst(e.x + (Math.random() - 0.5) * 60, e.y, 2, [C.yel200, '#fff'], 140);
      } else if (e.type === 'gateUp') {
        this.ring(e.x, e.y + 20, C.yel200, 110);
        this.parts.push({ x: e.x, y: e.y - 10, vx: 0, vy: -60, life: 1, max: 1, color: C.yel200, r: 30, text: `×${e.value}!` });
      } else if (e.type === 'mega') {
        this.ring(e.x, e.y + 20, C.lav500, 70);
      } else if (e.type === 'wallBreak') {
        this.burst(e.x, e.y, 26, ['#C9A36B', '#8A6A3F', C.lav200, '#fff'], 300);
        this.ring(e.x, e.y, '#fff', 110);
        this.shake = Math.min(14, this.shake + 8);
      } else if (e.type === 'unlock') {
        this.ring(e.x, e.y + 20, C.yel500, 150);
        this.burst(e.x, e.y + 20, 24, [C.yel500, C.yel200, '#9AA0C8', '#fff'], 300);
        this.parts.push({ x: e.x, y: e.y - 20, vx: 0, vy: -50, life: 1.2, max: 1.2, color: C.yel200, r: 30, text: `OPEN! ×${e.value}` });
        this.shake = Math.min(14, this.shake + 8);
      } else if (e.type === 'lockHit') {
        this.burst(e.x, e.y, 2, ['#C9CEE0', '#fff'], 110);
      } else if (e.type === 'capture') {
        this.ring(e.x, e.y + 20, C.yel500, 150);
        this.burst(e.x, e.y + 20, 20, [C.yel500, C.yel200, '#fff'], 280);
        this.parts.push({ x: e.x, y: e.y - 16, vx: 0, vy: -50, life: 1.2, max: 1.2, color: C.yel200, r: 26, text: 'GATE CAPTURED!' });
      } else if (e.type === 'gateLost') {
        this.parts.push({ x: e.x, y: e.y - 40, vx: 0, vy: -40, life: 1, max: 1, color: '#fff', r: 22, text: 'Gate lost!' });
      } else if (e.type === 'teleport') {
        this.ring(e.x, e.y, C.lav500, 120);
        this.burst(e.x, e.y, 18, [C.lav500, C.lav200, '#fff'], 260);
      } else if (e.type === 'dash') {
        this.shake = Math.min(12, this.shake + 7);
        this.burst(e.x, e.y + 40, 10, ['#C9A36B', '#fff'], 200);
      } else if (e.type === 'thaw') {
        // ice shatters: shards fly off
        this.burst(e.x, e.y, 10, ['#BFE9FF', '#fff', C.blue500], 220);
      } else if (e.type === 'armorBreak') {
        this.burst(e.x, e.y, 16, ['#8E96B8', '#3B4270', '#fff'], 260);
        this.parts.push({ x: e.x, y: e.y - 30, vx: 0, vy: -50, life: 0.8, max: 0.8, color: '#fff', r: 20, text: 'CRACK!' });
      } else if (e.type === 'armorHit') {
        this.burst(e.x, e.y, 2, ['#C9CEE0', '#fff'], 120);
      } else if (e.type === 'heal') {
        this.ring(e.x, e.y, '#3CCB7F', 120);
        this.parts.push({ x: e.x, y: e.y - 24, vx: 0, vy: -40, life: 0.6, max: 0.6, color: '#C8F5D8', r: 18, text: '+' });
      } else if (e.type === 'steal') {
        this.parts.push({ x: e.x, y: e.y - 30, vx: 0, vy: -30, life: 0.7, max: 0.7, color: C.yel200, r: 22, text: '!' });
      } else if (e.type === 'wallChew') {
        this.burst(e.x, e.y, 3, ['#C9A36B', '#8A6A3F'], 90);
      } else if (e.type === 'wallHit') {
        this.burst(e.x, e.y, 2, ['#C9A36B', '#fff'], 100);
      } else if (e.type === 'split') {
        this.ring(e.x, e.y, C.or500, 80);
      } else if (e.type === 'finale') {
        this.say('LAST STAND!', 'The castle throws everything left!', C.or900);
        this.shake = 16;
      } else if (e.type === 'enrage') {
        this.say('HE\'S ANGRY!', 'Faster and meaner!', C.or900);
        this.shake = 16;
      } else if (e.type === 'won') {
        this.burst(W / 2, s.castle.y + 80, 90, [C.lav500, C.yel500, C.blue500, C.or500, '#fff'], 520, true);
        this.shake = 18;
      }
    }
    s.events.length = 0;
  }

  /** Expanding shockwave ring. */
  private ring(x: number, y: number, color: string, size: number) {
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, color, r: size, ring: true });
  }

  say(text: string, sub: string, color: string) {
    this.banner = { text, sub, t: 0, color };
  }

  private burst(x: number, y: number, n: number, colors: string[], speed: number, confetti = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
      const life = confetti ? 1.4 + Math.random() : 0.35 + Math.random() * 0.3;
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (confetti ? 200 : 0), life, max: life,
        color: colors[i % colors.length], r: confetti ? 5 + Math.random() * 4 : 3 + Math.random() * 4, spin: confetti ? Math.random() * 10 : undefined,
      });
    }
  }

  private background(s: State) {
    const biome = biomeFor(s.level);
    if (this.bg && this.bgId === biome.id) return this.bg;
    const c = this.bg ?? document.createElement('canvas');
    c.width = this.canvas.width; c.height = this.canvas.height;
    const g = c.getContext('2d')!;
    const dpr = this.px / this.scale;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(this.ox, this.oy);
    g.scale(this.scale, this.scale);
    paintBiome(g, biome, W, H, DANGER_Y);
    if (biome.laneTint) { g.fillStyle = biome.laneTint; g.fillRect(0, 0, W, DANGER_Y); }
    this.bg = c;
    this.bgId = biome.id;
    return c;
  }

  draw(s: State, dt: number) {
    this.t += dt;
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.background(s), 0, 0);

    this.shake = Math.max(0, this.shake - dt * 40);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    const dpr = this.px / this.scale;
    g.setTransform(this.px, 0, 0, this.px, (this.ox + sx * this.scale) * dpr, (this.oy + sy * this.scale) * dpr);

    const duel = s.def.boss;
    if (duel) g.globalAlpha = 0.45; // the castle is just scenery in a boss duel
    this.drawCastle(s);
    g.globalAlpha = 1;
    for (const gate of s.gates) if (gate.y > -1000) this.drawGate(gate.x, gate.y, gate.w, gate.h, gate.mega ? -1 : gate.mul, gate.flash);
    for (const w of s.walls) {
      if (Number.isFinite(w.maxHp)) { this.drawWall(w.x, w.y, w.w, w.h, w.hp / w.maxHp, w.flash); continue; }
      // Twin Lanes divider: a stone column with a soft shadow
      g.fillStyle = 'rgba(23,28,59,.25)'; g.beginPath(); g.roundRect(w.x + 4, w.y + 6, w.w, w.h, 8); g.fill();
      const sg = g.createLinearGradient(w.x, 0, w.x + w.w, 0);
      sg.addColorStop(0, '#C9CEE0'); sg.addColorStop(0.5, '#F4F5FA'); sg.addColorStop(1, '#9AA0C8');
      g.fillStyle = sg; g.beginPath(); g.roundRect(w.x, w.y, w.w, w.h, 8); g.fill();
      g.strokeStyle = '#6B7194'; g.lineWidth = 2;
      for (let y = w.y + 40; y < w.y + w.h; y += 40) { g.beginPath(); g.moveTo(w.x + 2, y); g.lineTo(w.x + w.w - 2, y); g.stroke(); }
    }
    // Gate Carriers: ropes from each carrier to the gate they haul
    g.strokeStyle = '#8A6A3F'; g.lineWidth = 3;
    for (const e of s.grumps) {
      if (!e.carry || !e.carry.carriers) continue;
      g.beginPath(); g.moveTo(e.x, e.y + e.r * 0.6); g.lineTo(e.x, e.carry.y + 4); g.stroke();
    }
    for (const b of s.bumpers) {
      const k = 1 + b.flash * 0.18;
      g.fillStyle = C.blue900; g.beginPath(); g.arc(b.x, b.y + 4, b.r * k, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.blue500; g.beginPath(); g.arc(b.x, b.y, b.r * k, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, b.r * k * 0.62, 0, Math.PI * 2); g.stroke();
      g.fillStyle = b.flash > 0.3 ? '#fff' : C.yel200; g.beginPath(); g.arc(b.x, b.y, b.r * 0.25, 0, Math.PI * 2); g.fill();
      // side arrows: "bounces left/right"
      g.fillStyle = '#fff';
      for (const sd of [-1, 1]) {
        const ax = b.x + sd * (b.r * k + 8);
        g.beginPath(); g.moveTo(ax + sd * 9, b.y); g.lineTo(ax, b.y - 7); g.lineTo(ax, b.y + 7); g.closePath(); g.fill();
      }
    }

    const px = this.px;
    const mini = sprite('mini', MINI_R + 2, px, (c, r) => hedgehog(c, r));
    const goldMini = sprite('goldMini', MINI_R + 3, px, (c, r) => hedgehog(c, r, { gold: true }));
    const megaMini = sprite('megaMini', 30, px, (c, r) => hedgehog(c, r, { hat: 'helmet', gold: true }));
    for (const m of s.minis) {
      if (m.pierce !== undefined) {
        const ms = megaMini.width / px;
        g.fillStyle = 'rgba(97,115,235,.35)'; g.beginPath(); g.arc(m.x, m.y, 38 + Math.sin(this.t * 20) * 3, 0, Math.PI * 2); g.fill();
        g.drawImage(megaMini, m.x - ms / 2, m.y - ms / 2, ms, ms);
        continue;
      }
      const img = m.power > s.damage ? goldMini : mini;
      const ms = img.width / px;
      g.drawImage(img, m.x - ms / 2, m.y - ms / 2, ms, ms);
    }

    for (const e of s.grumps) {
      const spr = sprite(e.kind, e.r, px, (c, r) => grump(c, r, e.kind));
      if (e.kind === 'zippy') {
        g.strokeStyle = 'rgba(255,122,99,.45)'; g.lineWidth = 4; g.lineCap = 'round';
        for (const k of [-6, 0, 6]) { g.beginPath(); g.moveTo(e.x + k, e.y - e.r - 4); g.lineTo(e.x + k, e.y - e.r - 18); g.stroke(); }
      }
      const size = spr.width / px;
      const squash = e.hitT > 0 ? 1.15 : 1 + Math.sin(this.t * 10 + e.x) * 0.04;
      g.save();
      g.translate(e.x, e.y);
      g.scale(squash, 2 - squash);
      g.drawImage(spr, -size / 2, -size / 2, size, size);
      if (e.hitT > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(spr, -size / 2, -size / 2, size, size); }
      g.restore();
      if (e.armor && e.armor > 0) {
        // Iron Grump's plank, cracking as it takes hits
        const a = e.armor / e.maxArmor!;
        g.fillStyle = '#8E96B8'; g.strokeStyle = '#3B4270'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(e.x - e.r * 1.25, e.y + e.r * 0.45, e.r * 2.5, e.r * 0.6, 4); g.fill(); g.stroke();
        g.fillStyle = '#3B4270';
        for (const k of [-0.9, 0, 0.9]) { g.beginPath(); g.arc(e.x + k * e.r, e.y + e.r * 0.75, 2.5, 0, Math.PI * 2); g.fill(); }
        if (a < 0.5) { g.beginPath(); g.moveTo(e.x - e.r * 0.3, e.y + e.r * 0.45); g.lineTo(e.x - e.r * 0.1, e.y + e.r * 0.8); g.lineTo(e.x - e.r * 0.35, e.y + e.r * 1.05); g.stroke(); }
      }
      const iceLeft = e.kind === 'king' ? s.freezeT - 2.5 : s.freezeT;
      if (iceLeft > 0) {
        // ice block; blinks during the last 0.8 s so you can see it's about to thaw
        const blink = iceLeft < 0.8 ? 0.35 + 0.65 * Math.abs(Math.sin(this.t * 16)) : 1;
        g.globalAlpha = blink;
        g.fillStyle = 'rgba(77,192,255,.45)'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(e.x - e.r - 5, e.y - e.r - 5, (e.r + 5) * 2, (e.r + 5) * 2, 8); g.fill(); g.stroke();
        g.globalAlpha = 1;
      }
      if (e.kind === 'big') this.bar(e.x - 26, e.y - e.r - 16, 52, 8, e.hp / e.maxHp, C.or900);
      if (e.kind === 'king' && s.boss.tele > 0) {
        const tx = s.boss.targetX;
        if (s.def.bossStyle === 'teleport') {
          // the Trickster's ghost: where he'll blink to
          g.save(); g.globalAlpha = 0.3 + 0.2 * Math.sin(this.t * 25);
          g.drawImage(spr, tx - size / 2, e.y - size / 2, size, size);
          g.restore();
          g.strokeStyle = C.lav500; g.lineWidth = 4; g.setLineDash([8, 8]);
          g.beginPath(); g.arc(tx, e.y, e.r + 14, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        } else if (s.def.bossStyle === 'dash') {
          // the Charger's red arrow: where he'll charge
          const dir = Math.sign(tx - e.x) || 1;
          g.strokeStyle = 'rgba(255,74,24,.85)'; g.fillStyle = 'rgba(255,74,24,.85)'; g.lineWidth = 8; g.lineCap = 'round';
          g.beginPath(); g.moveTo(e.x + dir * (e.r + 6), e.y); g.lineTo(tx - dir * 22, e.y + 20); g.stroke();
          g.beginPath(); g.moveTo(tx, e.y + 20); g.lineTo(tx - dir * 26, e.y + 4); g.lineTo(tx - dir * 26, e.y + 36); g.closePath(); g.fill();
        }
      }
      if (e.kind === 'king' && s.boss.shieldT > 0) {
        // golden shield bubble
        g.save();
        g.globalAlpha = 0.35 + Math.sin(this.t * 30) * 0.1;
        g.fillStyle = C.yel200;
        g.beginPath(); g.arc(e.x, e.y - 6, e.r + 22, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.9; g.lineWidth = 5; g.strokeStyle = C.yel500; g.stroke();
        g.restore();
      }
    }

    // Sir Boonty's giant charge
    const giant = sprite('giant', 46, px, (c, r) => hedgehog(c, r, { hat: 'helmet' }));
    for (const r of s.rollers) {
      const gs = giant.width / px;
      if (Math.random() < 0.6) this.parts.push({ x: r.x + (Math.random() - 0.5) * 60, y: r.y + 40, vx: 0, vy: 60, life: 0.4, max: 0.4, color: '#fff', r: 8 });
      g.drawImage(giant, r.x - gs / 2, r.y - gs / 2 + Math.sin(this.t * 30) * 3, gs, gs);
    }
    // Party Boonty's balloon bombs
    const colors = [C.blue500, C.or500, C.yel500, C.lav500, C.or900];
    s.balloons.forEach((b, i) => { if (b.t >= 0) balloon(g, b.x, b.y, 18, colors[i % colors.length]); });

    for (const gate of s.gates) {
      const cx = gate.x + gate.w / 2, cy = gate.y + gate.h / 2 + 1;
      if (gate.mega) { this.text('★ MEGA', cx, cy, 28 * (1 + gate.flash * 0.08), '#fff', C.lav900); continue; }
      if (gate.y < -1000) continue; // a carried gate that was lost
      if (gate.blocked) {
        g.fillStyle = 'rgba(23,28,59,.55)'; g.beginPath(); g.roundRect(gate.x, gate.y, gate.w, gate.h, 12); g.fill();
        this.text(gate.carriers ? `×${gate.mul} FREE IT!` : 'STOLEN!', cx, cy, 22, C.yel200, C.ink);
        continue;
      }
      if (gate.lockHp > 0) { this.drawLock(gate.x, gate.y, gate.w, gate.h, gate.mul, gate.lockHp / gate.lockMax, gate.flash); continue; }
      if (gate.grow && gate.mul < 5) {
        // fill bar: progress to the next level-up
        g.fillStyle = 'rgba(23,28,59,.35)'; g.beginPath(); g.roundRect(gate.x + 10, gate.y + gate.h - 10, gate.w - 20, 6, 3); g.fill();
        g.fillStyle = C.yel200; g.beginPath(); g.roundRect(gate.x + 10, gate.y + gate.h - 10, (gate.w - 20) * ((gate.count % 25) / 25), 6, 3); g.fill();
      }
      this.text((gate.mul < 1 ? '÷2' : '×' + gate.mul) + (gate.grow && gate.mul < 5 ? '↑' : ''), cx, cy - (gate.grow ? 3 : 0), 36 * (1 + gate.flash * 0.08), '#fff', C.ink);
    }
    const c = s.castle;
    if (duel && s.king) {
      this.bar(c.x - 150, c.y + c.h + 10, 300, 26, Math.max(0, s.king.hp) / s.king.maxHp, s.boss.enraged ? C.or900 : C.yel500);
      this.text('KING GRUMP ' + Math.max(0, Math.ceil(s.king.hp)), c.x, c.y + c.h + 23, 17, '#fff', C.ink);
    } else {
      this.bar(c.x - 110, c.y + c.h + 10, 220, 22, c.hp / c.maxHp, C.or900);
      this.text(String(Math.ceil(c.hp)), c.x, c.y + c.h + 21, 17, '#fff', C.ink);
    }

    this.drawCannon(s);
    this.drawSuperButton(s);
    this.drawParticles(dt, s.castle.y + s.castle.h + 21);
    this.drawHud(s);
    if (this.showHint) this.drawHint();
    this.drawBanner(dt);

    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 4);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(255,255,255,${this.flash * 0.6})`;
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.heartFlash > 0) {
      this.heartFlash = Math.max(0, this.heartFlash - dt * 3);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(255,74,24,${this.heartFlash * 0.28})`;
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private text(s: string, x: number, y: number, size: number, fill: string, stroke: string | null = C.ink) {
    const g = this.g;
    g.font = `900 ${size}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (stroke) { g.lineWidth = Math.max(3, size / 5); g.strokeStyle = stroke; g.strokeText(s, x, y); }
    g.fillStyle = fill; g.fillText(s, x, y);
  }

  private bar(x: number, y: number, w: number, h: number, p: number, color: string) {
    const g = this.g;
    g.fillStyle = 'rgba(23,28,59,.45)';
    g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    g.fillStyle = color;
    g.beginPath(); g.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * p), h - 4, (h - 4) / 2); g.fill();
  }

  private drawCastle(s: State) {
    const g = this.g, c = s.castle;
    const x = c.x - c.w / 2, y = c.y;
    const hitScale = 1 + c.flash * 0.03;
    g.save();
    g.translate(c.x, y + c.h);
    g.scale(hitScale, hitScale);
    g.translate(-c.x, -(y + c.h));
    // towers
    for (const tx of [x - 12, x + c.w - 40]) {
      g.fillStyle = '#E8604A';
      g.beginPath(); g.roundRect(tx, y - 18, 52, c.h + 18, 10); g.fill();
      g.fillStyle = C.or900;
      g.beginPath(); g.moveTo(tx - 6, y - 14); g.lineTo(tx + 26, y - 52); g.lineTo(tx + 58, y - 14); g.closePath(); g.fill();
    }
    // wall
    g.fillStyle = C.or500;
    g.beginPath(); g.roundRect(x + 20, y, c.w - 40, c.h, 12); g.fill();
    g.fillStyle = '#E8604A';
    for (let i = 0; i < 6; i++) g.fillRect(x + 30 + i * 30, y - 14, 18, 18);
    // bricks
    g.strokeStyle = 'rgba(160,40,20,.25)'; g.lineWidth = 2;
    for (let r = 1; r < 5; r++) { g.beginPath(); g.moveTo(x + 24, y + r * 26); g.lineTo(x + c.w - 24, y + r * 26); g.stroke(); }
    // door
    g.fillStyle = C.ink;
    g.beginPath(); g.moveTo(c.x - 34, y + c.h); g.lineTo(c.x - 34, y + c.h - 40); g.arc(c.x, y + c.h - 40, 34, Math.PI, 0); g.lineTo(c.x + 34, y + c.h); g.fill();
    // angry castle eyes
    for (const sgn of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(c.x + sgn * 30, y + 38, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.ink; g.beginPath(); g.arc(c.x + sgn * 28, y + 40, 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(c.x + sgn * 46, y + 20); g.lineTo(c.x + sgn * 16, y + 28); g.stroke();
    }
    if (c.flash > 0) {
      g.globalAlpha = c.flash * 0.2; g.fillStyle = '#fff';
      g.beginPath(); g.roundRect(x - 12, y - 18, c.w + 24, c.h + 18, 12); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  private drawGate(x: number, y: number, w: number, h: number, mul: number, flash: number) {
    const g = this.g;
    const col = mul === -1 ? C.lav500 : mul < 1 ? C.or900 : mul >= 3 ? C.yel500 : C.blue500;
    g.save();
    const cx = x + w / 2, cy = y + h / 2, k = 1 + flash * 0.08;
    g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
    g.globalAlpha = 0.55 + flash * 0.3;
    g.fillStyle = col;
    g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill();
    g.globalAlpha = 1;
    g.lineWidth = 5; g.strokeStyle = mul === -1 ? C.lav900 : mul < 1 ? '#B8330C' : mul >= 3 ? C.yel900 : C.blue900; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.roundRect(x + 6, y + 5, w - 12, 7, 4); g.fill();
    g.restore();
  }

  private drawCannon(s: State) {
    const g = this.g;
    const x = s.cannonX;
    const recoil = s.firing ? Math.sin(this.t * 45) * 2.5 : 0;
    // barrel
    g.fillStyle = C.lav900;
    g.beginPath(); g.roundRect(x - 17, CANNON_Y - 52 + recoil, 34, 56, 12); g.fill();
    g.fillStyle = C.lav500;
    g.beginPath(); g.roundRect(x - 21, CANNON_Y - 56 + recoil, 42, 14, 7); g.fill();
    // Boonty sitting at the controls
    const hat = HAT[s.hero], gold = s.goldT > 0;
    const hero = sprite('hero' + hat + gold, 34, this.px, (c, r) => hedgehog(c, r, { hat, gold }));
    const heroBlink = sprite('heroBlink' + hat + gold, 34, this.px, (c, r) => hedgehog(c, r, { blink: true, hat, gold }));
    const blink = this.t % 3.2 < 0.12;
    const img = blink ? heroBlink : hero;
    const size = img.width / this.px;
    const bob = Math.sin(this.t * 4) * 1.5;
    g.drawImage(img, x - size / 2, CANNON_Y + 34 - size / 2 + bob, size, size);
  }

  private drawParticles(dt: number, castleBarY: number) {
    const g = this.g;
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.home) {
        // curve toward the castle HP bar
        const tx = W / 2, ty = castleBarY;
        p.vx += (tx - p.x) * 14 * dt; p.vy += (ty - p.y) * 14 * dt; p.vx *= 0.9; p.vy *= 0.9;
        if (Math.abs(p.x - tx) < 30 && Math.abs(p.y - ty) < 20) p.life = 0;
      } else if (p.text) { p.vy *= 0.97; } else { p.vx *= 0.96; p.vy = p.vy * 0.96 + (p.spin !== undefined ? 500 : 0) * dt; }
      const a = Math.max(0, p.life / p.max);
      g.globalAlpha = Math.min(1, a * 1.5);
      if (p.ring) {
        g.strokeStyle = p.color; g.lineWidth = 8 * a;
        g.beginPath(); g.arc(p.x, p.y, p.r * (1 - a) + 10, 0, Math.PI * 2); g.stroke();
      } else if (p.text) this.text(p.text, p.x, p.y, p.r, p.color, C.ink);
      else if (p.spin !== undefined) {
        g.save(); g.translate(p.x, p.y); g.rotate(p.spin * p.life); g.fillStyle = p.color; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
      } else {
        g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
    this.parts = this.parts.filter(p => p.life > 0);
  }

  private drawHud(s: State) {
    const g = this.g;
    g.fillStyle = 'rgba(23,28,59,.55)';
    g.beginPath(); g.roundRect(14, 12, 132, 40, 20); g.fill();
    this.text('LEVEL ' + s.level, 80, 33, 20, '#fff', null);
    if (s.maxHearts <= 4) for (let i = 0; i < s.maxHearts; i++) this.heart(W - 36 - i * 40, 32, i < s.hearts);
    else {
      // lots of hearts: one heart and a count, so the HUD never grows into the pause button
      this.heart(W - 86, 32, s.hearts > 0);
      this.text(`×${s.hearts}`, W - 44, 33, 24, '#fff', C.ink);
    }
  }

  private heart(x: number, y: number, full: boolean) {
    const g = this.g;
    g.save(); g.translate(x, y);
    g.fillStyle = full ? C.or900 : 'rgba(23,28,59,.25)';
    g.strokeStyle = full ? '#fff' : 'transparent'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 12);
    g.bezierCurveTo(-20, -2, -12, -18, 0, -8);
    g.bezierCurveTo(12, -18, 20, -2, 0, 12);
    g.fill(); g.stroke();
    g.restore();
  }

  private drawBanner(dt: number) {
    const b = this.banner;
    if (!b) return;
    b.t += dt;
    const life = b.sub.length > 24 ? 3 : 2;
    if (b.t > life) { this.banner = null; return; }
    // pop in, hold, fade out
    const k = b.t < 0.2 ? 0.6 + (b.t / 0.2) * 0.5 : b.t < 0.3 ? 1.1 - ((b.t - 0.2) / 0.1) * 0.1 : 1;
    const g = this.g;
    g.globalAlpha = Math.min(1, (life - b.t) * 3);
    g.save(); g.translate(W / 2, 690); g.scale(k, k);
    this.text(b.text, 0, 0, 52, b.color === C.yel500 ? C.yel200 : '#fff', b.color === C.yel500 ? C.ink : b.color);
    if (b.sub) this.text(b.sub, 0, 46, 22, '#fff', C.ink);
    g.restore();
    g.globalAlpha = 1;
  }

  /** Chains across the gate, a padlock in the middle, and what's waiting behind it. */
  private drawLock(x: number, y: number, w: number, h: number, mul: number, hp: number, flash: number) {
    const g = this.g;
    g.fillStyle = 'rgba(23,28,59,.45)';
    g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill();
    g.strokeStyle = '#9AA0C8'; g.lineWidth = 5; g.setLineDash([10, 6]);
    g.beginPath(); g.moveTo(x + 4, y + 6); g.lineTo(x + w - 4, y + h - 6); g.moveTo(x + 4, y + h - 6); g.lineTo(x + w - 4, y + 6); g.stroke();
    g.setLineDash([]);
    const cx = x + w / 2, cy = y + h / 2, sh = (Math.random() - 0.5) * flash * 6;
    g.strokeStyle = '#6B7194'; g.lineWidth = 6;
    g.beginPath(); g.arc(cx + sh, cy - 10, 12, Math.PI, 0); g.stroke();
    g.fillStyle = C.yel500; g.strokeStyle = C.yel900; g.lineWidth = 3;
    g.beginPath(); g.roundRect(cx - 18 + sh, cy - 10, 36, 28, 6); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(cx + sh, cy + 2, 4, 0, Math.PI * 2); g.fill(); g.fillRect(cx - 2 + sh, cy + 2, 4, 9);
    this.text('×' + mul, x + w - 26, cy, 26, C.yel200, C.ink);
    this.bar(cx - 40, y - 14, 80, 9, hp, C.yel500);
  }

  private drawWall(x: number, y: number, w: number, h: number, hp: number, flash: number) {
    // a stack of wooden Boonty crates
    const g = this.g;
    g.save();
    g.translate((Math.random() - 0.5) * flash * 4, 0);
    g.fillStyle = '#8A6A3F';
    g.beginPath(); g.roundRect(x, y + 4, w, h, 8); g.fill();
    g.fillStyle = flash > 0.5 ? '#F1DDB4' : '#D9B77E';
    g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
    g.strokeStyle = '#8A6A3F'; g.lineWidth = 3;
    const n = Math.max(1, Math.round(w / 46));
    for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo(x + (w * i) / n, y + 2); g.lineTo(x + (w * i) / n, y + h - 2); g.stroke(); }
    for (let i = 0; i < n; i++) { const cx = x + (w * (i + 0.5)) / n; g.beginPath(); g.moveTo(cx - 12, y + 6); g.lineTo(cx + 12, y + h - 6); g.stroke(); }
    if (hp < 0.66) {
      g.strokeStyle = C.ink; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x + w * 0.3, y); g.lineTo(x + w * 0.36, y + h * 0.5); g.lineTo(x + w * 0.3, y + h); g.stroke();
      if (hp < 0.33) { g.beginPath(); g.moveTo(x + w * 0.7, y); g.lineTo(x + w * 0.64, y + h * 0.6); g.stroke(); }
    }
    g.restore();
    this.bar(x + w / 2 - 30, y - 12, 60, 8, hp, '#8A6A3F');
  }

  private drawSuperButton(s: State) {
    const g = this.g, b = SUPER_BTN;
    const ready = s.charge >= 1;
    const pulse = ready ? 1 + Math.sin(this.t * 8) * 0.07 : 1;
    g.save();
    g.translate(b.x, b.y); g.scale(pulse, pulse);
    if (ready) { g.fillStyle = 'rgba(254,229,128,.45)'; g.beginPath(); g.arc(0, 0, b.r + 14, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = C.lav900;
    g.beginPath(); g.arc(0, 0, b.r, 0, Math.PI * 2); g.fill();
    const img = this.portrait(s.hero);
    if (img.complete && img.naturalWidth) {
      g.save();
      g.beginPath(); g.arc(0, 0, b.r - 7, 0, Math.PI * 2); g.clip();
      g.globalAlpha = ready ? 1 : 0.55;
      g.drawImage(img, -b.r + 7, -b.r + 7, (b.r - 7) * 2, (b.r - 7) * 2);
      g.restore();
    }
    // charge ring
    g.lineWidth = 7; g.lineCap = 'round';
    g.strokeStyle = 'rgba(23,28,59,.35)';
    g.beginPath(); g.arc(0, 0, b.r - 3, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = ready ? C.yel500 : C.yel200;
    g.beginPath(); g.arc(0, 0, b.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.charge); g.stroke();
    g.restore();
    this.text(ready ? 'TAP!' : 'SUPER', b.x, b.y + b.r + 4, ready ? 20 : 15, ready ? C.yel200 : '#fff', C.ink);
  }

  private drawHint() {
    const g = this.g;
    const x = W / 2 + Math.sin(this.t * 2.2) * 110, y = CANNON_Y + 20;
    this.text('HOLD & DRAG', W / 2, DANGER_Y - 64, 30, '#fff', C.lav900);
    this.text("Don't let Grumps cross the line!", W / 2, DANGER_Y - 30, 20, '#fff', C.or900);
    g.save(); g.translate(x, y);
    g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-10, -10, 20, 40, 10); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(-18, 14, 36, 36, 13); g.fill(); g.stroke();
    g.restore();
  }
}
