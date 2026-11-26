"use client";

import { useEffect, useRef } from "react";

/**
 * Living scientific figures for the programme cards. Each figure is drawn on a
 * 400 × 440 design grid and scaled to the card. Animation pauses off-screen and
 * collapses to a single finished frame for visitors who prefer reduced motion.
 */

export type FigureKind = "body" | "layers" | "harmonograph";

const W = 400;
const H = 440;
const GOLD = "232, 213, 169";
const FONT = '"Instrument Sans Variable", "Helvetica Neue", Arial, sans-serif';

type Painter = {
  frame(time: number): void;
  still(): void;
};

type Labels = { bands: [string, string][]; lines: [string, string][]; ratio: string; damping: string };

/* ------------------------------------------------------------------------- */
/* Figure 01: myofascial lines on a standing figure                          */
/* ------------------------------------------------------------------------- */

type Point = readonly [number, number];

const CX = 138; // body centre line on the design grid

// Right half of the body outline (x is the offset from the centre line),
// from the neck down around the arm and leg to the crotch.
const BODY_HALF: Point[] = [
  [9, 88], [10, 104], [26, 110], [44, 118], [53, 132], [56, 160], [60, 196], [65, 232], [70, 258], [73, 270],
  [72, 284], [66, 287], [63, 273], [60, 258], [54, 230], [49, 198], [44, 166], [37, 146], [35, 172], [30, 204],
  [35, 232], [39, 256], [38, 290], [32, 326], [33, 350], [26, 384], [23, 398], [30, 410], [8, 410], [9, 396],
  [12, 360], [11, 326], [8, 290], [2, 266], [0, 264],
];

// Each line is listed from the feet upwards; it is drawn on both sides.
const FASCIA_LINES: { points: Point[]; anchor: Point; labelY: number }[] = [
  {
    // Superficial front line: top of the foot, shin, thigh, abdomen, sternum, neck.
    points: [[16, 404], [18, 370], [20, 340], [21, 318], [24, 290], [22, 262], [14, 236], [12, 206], [12, 176], [14, 150], [8, 120], [6, 108], [12, 92], [15, 78]],
    anchor: [24, 290],
    labelY: 280,
  },
  {
    // Lateral line: outer ankle, iliotibial band, flank, side of the neck to the ear.
    points: [[20, 398], [26, 370], [28, 340], [34, 300], [36, 262], [32, 232], [26, 206], [30, 176], [32, 152], [22, 118], [12, 98], [17, 72]],
    anchor: [28, 340],
    labelY: 355,
  },
  {
    // Spiral line: arch of the foot, across the abdomen to the opposite shoulder.
    points: [[-16, 404], [-22, 370], [-28, 330], [-34, 290], [-30, 252], [-18, 226], [0, 196], [18, 160], [30, 124]],
    anchor: [24, 142],
    labelY: 130,
  },
  {
    // Deep front line: inner arch, adductors, psoas, diaphragm, to the jaw.
    points: [[6, 406], [11, 372], [10, 330], [6, 290], [4, 262], [5, 232], [6, 200], [6, 176], [5, 140], [4, 108], [6, 92]],
    anchor: [6, 200],
    labelY: 205,
  },
];

const LINE_SECONDS = 4.5; // each line is traced in turn
const TRACE_SECONDS = 3.2;
const BREATH = 6; // seconds per breath

// Catmull-Rom spline through the points, returned as a dense polyline.
function smooth(points: Point[], steps = 10): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function bodyPainter(ctx: CanvasRenderingContext2D, labels: Labels): Painter {
  const fullOutline: Point[] = [...BODY_HALF, ...BODY_HALF.slice(0, -1).reverse().map(([x, y]) => [-x, y] as Point)];
  const outline = smooth(fullOutline, 6);
  const lines = FASCIA_LINES.map((line) => ({
    ...line,
    sides: [line.points, line.points.map(([x, y]) => [-x, y] as Point)].map((pts) => smooth(pts, 8)),
  }));

  // The chest widens a little on each in-breath.
  function warp([x, y]: Point, breath: number): Point {
    const bump = Math.exp(-Math.pow((y - 168) / 46, 2));
    return [CX + x * (1 + breath * 0.045 * bump), y];
  }

  function path(points: Point[], breath: number, until = points.length) {
    ctx.beginPath();
    for (let i = 0; i < until; i += 1) {
      const [x, y] = warp(points[i], breath);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function render(active: number, progress: number, breath: number) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Faint aura: the outline repeated outward, breathing with the figure.
    for (let ring = 3; ring >= 1; ring -= 1) {
      const s = 1 + ring * 0.055 + breath * 0.012;
      ctx.save();
      ctx.translate(CX, 236);
      ctx.scale(s, 1 + ring * 0.035);
      ctx.translate(-CX, -236);
      path(outline, breath);
      ctx.strokeStyle = `rgba(${GOLD}, ${0.1 - ring * 0.022})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.restore();
    }

    // Body outline and head.
    path(outline, breath);
    ctx.fillStyle = "rgba(232, 213, 169, 0.035)";
    ctx.fill();
    ctx.strokeStyle = `rgba(${GOLD}, 0.8)`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(CX, 65, 19, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Diaphragm: a dome that flattens as the breath comes in.
    const dome = 172 + breath * 7;
    ctx.beginPath();
    ctx.moveTo(CX - 28, 188);
    ctx.quadraticCurveTo(CX, dome - 14, CX + 28, 188);
    ctx.strokeStyle = `rgba(${GOLD}, ${active === 3 ? 0.55 : 0.22})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    lines.forEach((line, index) => {
      const isActive = index === active;
      for (const side of line.sides) {
        // Resting line: faint and dotted.
        ctx.setLineDash([1, 4]);
        path(side, breath);
        ctx.strokeStyle = `rgba(${GOLD}, ${isActive ? 0.35 : 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.setLineDash([]);
        if (!isActive) continue;

        // Traced part of the active line.
        const until = Math.max(2, Math.round(progress * side.length));
        path(side, breath, until);
        ctx.save();
        ctx.shadowColor = `rgba(${GOLD}, 0.7)`;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = `rgba(${GOLD}, 0.9)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        if (progress < 1) {
          const [px, py] = warp(side[until - 1], breath);
          const halo = ctx.createRadialGradient(px, py, 0, px, py, 13);
          halo.addColorStop(0, `rgba(${GOLD}, 0.6)`);
          halo.addColorStop(1, `rgba(${GOLD}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(px, py, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f7ead0";
          ctx.beginPath();
          ctx.arc(px, py, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Leader and label.
      const [ax, ay] = warp(line.anchor, breath);
      const strength = isActive ? 1 : 0;
      ctx.strokeStyle = `rgba(${GOLD}, ${0.2 + strength * 0.45})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(ax, ay, 2, 0, Math.PI * 2);
      ctx.moveTo(ax + 2, ay);
      ctx.lineTo(262, line.labelY);
      ctx.lineTo(272, line.labelY);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.font = `600 10px ${FONT}`;
      ctx.fillStyle = `rgba(${GOLD}, ${0.5 + strength * 0.5})`;
      ctx.fillText(labels.lines[index][0].toLocaleUpperCase("tr"), 398, line.labelY - 3);
      ctx.font = `400 10px ${FONT}`;
      ctx.fillStyle = `rgba(${GOLD}, ${0.38 + strength * 0.42})`;
      ctx.fillText(labels.lines[index][1], 398, line.labelY + 11);
    });
  }

  return {
    frame(time) {
      const t = time / 1000;
      const active = Math.floor(t / LINE_SECONDS) % lines.length;
      const local = (t % LINE_SECONDS) / TRACE_SECONDS;
      const p = Math.min(local, 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const breath = (1 - Math.cos((t / BREATH) * Math.PI * 2)) / 2;
      render(active, eased, breath);
    },
    still() {
      render(0, 1, 0.5);
    },
  };
}

/* ------------------------------------------------------------------------- */
/* Figure 02: layers of consciousness inside a head profile                  */
/* ------------------------------------------------------------------------- */

const HEAD_PATH =
  "M118 418C118 380 104 352 96 328C72 296 62 246 68 204C74 134 128 86 194 88C256 91 291 138 289 196C288 212 293 222 301 236C309 250 317 262 315 270C313 276 305 278 301 280C303 290 305 296 301 302C305 308 303 314 297 318C299 330 293 344 277 350C261 355 241 352 233 352C229 370 229 394 233 418";

function layersPainter(ctx: CanvasRenderingContext2D, labels: Labels): Painter {
  const head = new Path2D(HEAD_PATH);
  // Brain-wave bands: faster and livelier near the surface, slower and calmer below.
  const bands = [
    { y: 148, lines: 3, freq: 0.16, amp: 5.5, speed: 2.6 },
    { y: 206, lines: 3, freq: 0.095, amp: 4.5, speed: 1.6 },
    { y: 264, lines: 3, freq: 0.055, amp: 4, speed: 0.9 },
    { y: 322, lines: 3, freq: 0.03, amp: 3.5, speed: 0.45 },
  ];
  const DESCENT = 12; // seconds for the marker to sink from the surface to the deepest band

  function wave(bandIndex: number, line: number, t: number, alphaInside: number, glow: number) {
    const band = bands[bandIndex];
    const y0 = band.y + (line - 1) * 9;
    const draw = (from: number, to: number, alpha: number) => {
      ctx.beginPath();
      for (let x = from; x <= to; x += 2) {
        const y = y0 + Math.sin(x * band.freq - t * band.speed + line * 0.9) * band.amp * (1 + glow * 0.5);
        if (x === from) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${GOLD}, ${alpha})`;
      ctx.lineWidth = line === 1 ? 1.1 + glow * 0.6 : 0.7;
      ctx.stroke();
    };
    // Inside the head: full strength.
    ctx.save();
    ctx.clip(head);
    draw(40, 320, alphaInside + glow * 0.4);
    ctx.restore();
    // Outside the head the waves continue faintly towards their labels.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip(new Path2D(`M0 0H${W}V${H}H0Z ${HEAD_PATH}`), "evenodd");
    draw(300, 340, (alphaInside + glow * 0.4) * 0.28);
    ctx.restore();
  }

  function render(t: number, markerY: number) {
    ctx.clearRect(0, 0, W, H);

    // Soft depth gradient inside the head.
    ctx.save();
    ctx.clip(head);
    const depth = ctx.createLinearGradient(0, 120, 0, 360);
    depth.addColorStop(0, "rgba(232, 213, 169, 0.02)");
    depth.addColorStop(1, "rgba(232, 213, 169, 0.10)");
    ctx.fillStyle = depth;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    bands.forEach((band, bandIndex) => {
      const distance = Math.abs(markerY - band.y);
      const glow = Math.max(0, 1 - distance / 34);
      for (let line = 0; line < band.lines; line += 1) wave(bandIndex, line, t, 0.32 + bandIndex * 0.06, glow);

      // Label with a short leader line.
      ctx.strokeStyle = `rgba(${GOLD}, ${0.25 + glow * 0.5})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(344, band.y);
      ctx.lineTo(350, band.y);
      ctx.stroke();
      ctx.fillStyle = `rgba(${GOLD}, ${0.55 + glow * 0.45})`;
      ctx.textAlign = "right";
      ctx.font = `600 10px ${FONT}`;
      ctx.fillText(labels.bands[bandIndex][0].toLocaleUpperCase("tr"), 398, band.y - 3);
      ctx.font = `400 10px ${FONT}`;
      ctx.fillStyle = `rgba(${GOLD}, ${0.4 + glow * 0.4})`;
      ctx.fillText(labels.bands[bandIndex][1], 398, band.y + 11);
    });

    // Head outline.
    ctx.strokeStyle = `rgba(${GOLD}, 0.85)`;
    ctx.lineWidth = 1.3;
    ctx.stroke(head);

    // Descending marker with its trail.
    const trail = ctx.createLinearGradient(0, 120, 0, markerY);
    trail.addColorStop(0, `rgba(${GOLD}, 0)`);
    trail.addColorStop(1, `rgba(${GOLD}, 0.55)`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(184, 120);
    ctx.lineTo(184, markerY);
    ctx.stroke();
    const halo = ctx.createRadialGradient(184, markerY, 0, 184, markerY, 16);
    halo.addColorStop(0, `rgba(${GOLD}, 0.55)`);
    halo.addColorStop(1, `rgba(${GOLD}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(184, markerY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5e8c8";
    ctx.beginPath();
    ctx.arc(184, markerY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    frame(time) {
      const t = time / 1000;
      const cycle = (t % (DESCENT + 3)) / DESCENT; // sink, rest briefly, rise again
      const p = Math.min(cycle, 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      render(t, 140 + eased * (bands[3].y - 140));
    },
    still() {
      render(0, bands[2].y);
    },
  };
}

/* ------------------------------------------------------------------------- */
/* Figure 03: harmonograph, a pendulum drawing machine                       */
/* ------------------------------------------------------------------------- */

// Two lateral pendulums (x and y) plus a small rotary pendulum under the paper,
// as on a classic three-pendulum harmonograph.
type Preset = { fx: number; fy: number; px: number; py: number; d: number; ratio: string };

const PRESETS: Preset[] = [
  { fx: 2, fy: 3.008, px: Math.PI / 2, py: 0, d: 0.0045, ratio: "2 : 3" },
  { fx: 3, fy: 4.006, px: Math.PI / 2, py: Math.PI / 4, d: 0.004, ratio: "3 : 4" },
  { fx: 1, fy: 2.004, px: Math.PI / 4, py: 0, d: 0.005, ratio: "1 : 2" },
  { fx: 3.006, fy: 2, px: 0, py: Math.PI / 2, d: 0.0042, ratio: "3 : 2" },
];

const DRAW_SECONDS = 15;
const HOLD_SECONDS = 2.5;
const FADE_SECONDS = 1.5;
const T_MAX = 520;

function harmonographPoint(preset: Preset, t: number) {
  const decay = Math.exp(-preset.d * t);
  const rotary = Math.exp(-preset.d * 0.8 * t);
  const fr = preset.fx * 1.0015;
  const x = 200 + 118 * Math.sin(preset.fx * t + preset.px) * decay + 26 * Math.sin(fr * t) * rotary;
  const y = 222 + 118 * Math.sin(preset.fy * t + preset.py) * decay + 26 * Math.cos(fr * t) * rotary;
  return [x, y] as const;
}

function harmonographPainter(ctx: CanvasRenderingContext2D, labels: Labels): Painter {
  const cycleLength = DRAW_SECONDS + HOLD_SECONDS + FADE_SECONDS;

  function trace(preset: Preset, until: number, alpha: number) {
    const steps = Math.floor(until / 0.03);
    ctx.lineWidth = 0.6;
    // Draw in short runs so older (outer) strokes read lighter than fresh ones.
    for (let start = 0; start < steps; start += 120) {
      ctx.beginPath();
      for (let i = start; i <= Math.min(start + 120, steps); i += 1) {
        const [x, y] = harmonographPoint(preset, i * 0.03);
        if (i === start) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const age = start / Math.max(steps, 1);
      ctx.strokeStyle = `rgba(${GOLD}, ${alpha * (0.28 + age * 0.5)})`;
      ctx.stroke();
    }
  }

  function annotate(preset: Preset, alpha: number) {
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${GOLD}, ${0.7 * alpha})`;
    ctx.font = `600 9px ${FONT}`;
    ctx.fillText(labels.ratio.toLocaleUpperCase("tr"), 22, 410);
    ctx.font = `400 15px "Fraunces Variable", Georgia, serif`;
    ctx.fillText(preset.ratio, 22, 428);
    ctx.textAlign = "right";
    ctx.font = `600 9px ${FONT}`;
    ctx.fillText(labels.damping.toLocaleUpperCase("tr"), 378, 410);
    ctx.font = `400 15px "Fraunces Variable", Georgia, serif`;
    ctx.fillText(preset.d.toFixed(4).replace(".", ","), 378, 428);
  }

  function crosshair() {
    ctx.strokeStyle = `rgba(${GOLD}, 0.12)`;
    ctx.lineWidth = 0.6;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(200, 50);
    ctx.lineTo(200, 394);
    ctx.moveTo(30, 222);
    ctx.lineTo(370, 222);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  return {
    frame(time) {
      const t = time / 1000;
      const index = Math.floor(t / cycleLength) % PRESETS.length;
      const preset = PRESETS[index];
      const local = t % cycleLength;
      const progress = Math.min(local / DRAW_SECONDS, 1);
      const eased = 1 - Math.pow(1 - progress, 1.6);
      const fade = local > DRAW_SECONDS + HOLD_SECONDS ? 1 - (local - DRAW_SECONDS - HOLD_SECONDS) / FADE_SECONDS : 1;
      const until = eased * T_MAX;

      ctx.clearRect(0, 0, W, H);
      crosshair();
      trace(preset, until, fade);

      if (progress < 1) {
        const [px, py] = harmonographPoint(preset, until);
        const halo = ctx.createRadialGradient(px, py, 0, px, py, 14);
        halo.addColorStop(0, `rgba(${GOLD}, 0.6)`);
        halo.addColorStop(1, `rgba(${GOLD}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f7ead0";
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      annotate(preset, fade);
    },
    still() {
      ctx.clearRect(0, 0, W, H);
      crosshair();
      trace(PRESETS[0], T_MAX, 1);
      annotate(PRESETS[0], 1);
    },
  };
}

/* ------------------------------------------------------------------------- */

export default function ProgramFigure({ kind, labels }: { kind: FigureKind; labels: Labels }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelKey = JSON.stringify(labels);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const painter =
      kind === "body" ? bodyPainter(ctx, labels) : kind === "layers" ? layersPainter(ctx, labels) : harmonographPainter(ctx, labels);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let onScreen = true;
    let frame = 0;
    let elapsed = 0;
    let last = performance.now();

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      const scale = Math.min(canvas!.width / W, canvas!.height / H);
      const offsetX = (canvas!.width - W * scale) / 2;
      const offsetY = (canvas!.height - H * scale) / 2;
      ctx!.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      if (reduceMotion) painter.still();
      else painter.frame(elapsed);
    }

    // Time only advances while the figure is visible, so a figure never
    // "skips ahead" when the visitor scrolls back to it.
    function loop(now: number) {
      const delta = Math.min(now - last, 100);
      last = now;
      if (onScreen) {
        elapsed += delta;
        painter.frame(elapsed);
      }
      frame = requestAnimationFrame(loop);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    if (reduceMotion) return () => resizeObserver.disconnect();

    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    intersection.observe(canvas);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
    };
    // labelKey captures label changes (language switch) without re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, labelKey]);

  return <canvas ref={canvasRef} className="program-figure" aria-hidden="true" />;
}
