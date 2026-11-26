"use client";

import { useEffect } from "react";

/**
 * Homepage scroll effects.
 *
 * Reveal: blocks rise and fade in once as they enter the viewport, with a short
 * stagger between siblings. Content stays fully visible without JavaScript
 * because the hidden state only applies once `reveal-ready` is set on <html>.
 *
 * Manifesto: each `.manifesto-line` gets a `--p` value (0 → 1) as it travels
 * up through the viewport; CSS uses it to light the words one by one.
 */

const REVEAL_SELECTOR = [
  ".section-heading",
  ".about-grid > .large-copy",
  ".principles article",
  ".program-card",
  ".manifesto-heading",
  ".faculty-note > div:first-child",
  ".faculty-note > p",
  ".faculty-card",
  ".media-card",
  ".contact-intro",
].join(",");

export default function useScrollEffects(deps: unknown[] = []) {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lines = Array.from(document.querySelectorAll<HTMLElement>(".manifesto-line"));

    if (reduceMotion) {
      lines.forEach((line) => line.style.setProperty("--p", "1"));
      return;
    }

    // Reveal on enter.
    const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
      (element) => !element.classList.contains("is-revealed"),
    );
    targets.forEach((element) => {
      const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
      const index = Math.max(0, siblings.indexOf(element));
      element.setAttribute("data-reveal", "");
      element.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 90}ms`);
    });
    root.classList.add("reveal-ready");
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((element) => reveal.observe(element));

    // Manifesto progress.
    let frame = 0;
    function update() {
      frame = 0;
      const vh = window.innerHeight;
      for (const line of lines) {
        const rect = line.getBoundingClientRect();
        // 0 when the line's top reaches 85% of the viewport, 1 when it reaches 40%.
        const p = (vh * 0.85 - rect.top) / (vh * 0.45);
        line.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      reveal.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
