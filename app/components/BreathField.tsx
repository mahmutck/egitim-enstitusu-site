"use client";

import { useEffect, useRef } from "react";

/**
 * Topographic contour field that expands and contracts on a slow breathing
 * rhythm (4 s in, 4 s out). A brighter contour travels outward with each
 * breath and the field leans gently toward the pointer. Renders one static
 * frame when the visitor prefers reduced motion, and pauses while off-screen.
 */

const BREATH_SECONDS = 8;
const LINES = 26;
const SAMPLES = 160;

type Wave = { k: number; amp: number; phase: number; speed: number };

// Deterministic pseudo-random so the shape is identical on every visit.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildWaves(): Wave[] {
  const rand = seeded(20261125);
  return [2, 3, 5, 7].map((k, i) => ({
    k,
    amp: 0.11 / (i + 1) + rand() * 0.04,
    phase: rand() * Math.PI * 2,
    speed: (rand() - 0.5) * 0.12,
  }));
}

export default function BreathField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const waves = buildWaves();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    const anchor = { x: 0, y: 0, size: 0 };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const start = performance.now();

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Centre the rings on the institute emblem when it is present.
      // Layout offsets ignore the emblem's own fade and breathing transforms.
      const emblem = canvas!.parentElement?.querySelector<HTMLElement>(".hero-emblem");
      if (emblem && emblem.offsetParent === canvas!.parentElement) {
        anchor.x = emblem.offsetLeft + emblem.offsetWidth / 2;
        anchor.y = emblem.offsetTop + emblem.offsetHeight / 2;
        anchor.size = Math.max(emblem.offsetWidth, emblem.offsetHeight);
      } else {
        anchor.x = width * 0.72;
        anchor.y = height * 0.5;
        anchor.size = 0;
      }
    }

    function draw(now: number) {
      const t = (now - start) / 1000;
      const breath = (1 - Math.cos((t / BREATH_SECONDS) * Math.PI * 2)) / 2; // 0..1..0
      const wavePos = (t % BREATH_SECONDS) / BREATH_SECONDS; // travelling highlight

      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      const mobile = width < 760;
      const cx = anchor.x;
      const cy = anchor.y;
      const base = Math.max(anchor.size * 0.62, Math.max(width, height) * 0.035);
      const gap = Math.max(width, height) * (mobile ? 0.034 : 0.025);
      const scale = 1 + breath * 0.06;

      ctx!.clearRect(0, 0, width, height);
      ctx!.lineWidth = 1;

      for (let i = 0; i < LINES; i += 1) {
        const level = i / (LINES - 1);
        const radius = (base + i * gap) * scale;
        const warp = 0.35 + level * 0.9;
        const distance = Math.abs(level - wavePos);
        const glow = Math.max(0, 1 - distance * 9);
        const alpha = 0.1 + (1 - level) * 0.2 + glow * 0.6;

        ctx!.beginPath();
        for (let s = 0; s <= SAMPLES; s += 1) {
          const a = (s / SAMPLES) * Math.PI * 2;
          let r = 1;
          for (const w of waves) r += w.amp * warp * Math.sin(w.k * a + w.phase + t * w.speed + level * 1.7);
          // Lean toward the pointer.
          r += 0.05 * (pointer.x * Math.cos(a) + pointer.y * Math.sin(a)) * level;
          const x = cx + Math.cos(a) * radius * r * 1.18;
          const y = cy + Math.sin(a) * radius * r;
          if (s === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.closePath();
        ctx!.strokeStyle = glow > 0.05 ? `rgba(232, 213, 169, ${alpha})` : `rgba(160, 190, 220, ${alpha * 0.8})`;
        ctx!.lineWidth = glow > 0.05 ? 1 + glow * 0.6 : 1;
        ctx!.stroke();
      }
    }

    function loop(now: number) {
      if (visible) draw(now);
      frame = requestAnimationFrame(loop);
    }

    function onPointer(event: PointerEvent) {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    }

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(start + 2000);
    });
    resizeObserver.observe(canvas);
    const emblemElement = canvas.parentElement?.querySelector(".hero-emblem");
    if (emblemElement) resizeObserver.observe(emblemElement);

    if (reduceMotion) {
      draw(start + 2000);
      return () => resizeObserver.disconnect();
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
    });
    intersection.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="breath-field" aria-hidden="true" />;
}
