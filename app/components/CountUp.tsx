"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a figure such as "43.000+" up from zero the first time it scrolls
 * into view. The server renders the final value, so the real number is what
 * search engines, no-JS visitors and reduced-motion visitors see.
 */

const DURATION = 1800;

function parse(value: string) {
  const match = value.match(/^(\D*)([\d.,]+)(\D*)$/);
  if (!match) return null;
  const digits = match[2].replace(/[.,]/g, "");
  return { prefix: match[1], target: Number(digits), suffix: match[3], grouped: /[.,]/.test(match[2]) };
}

export default function CountUp({ value, locale }: { value: string; locale: string }) {
  const ref = useRef<HTMLElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const parts = parse(value);
    const element = ref.current;
    if (!parts || !element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const format = (n: number) =>
      `${parts.prefix}${parts.grouped ? n.toLocaleString(locale) : String(n)}${parts.suffix}`;

    let frame = 0;
    let started = false;
    // Only reset to zero if the figure is still below the fold, so it never visibly jumps.
    if (element.getBoundingClientRect().top > window.innerHeight) setDisplay(format(0));
    else {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / DURATION, 1);
          const eased = 1 - Math.pow(2, -10 * t); // ease-out expo
          setDisplay(t === 1 ? value : format(Math.round(parts.target * eased)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, locale]);

  return (
    <strong ref={ref} className="count-up">
      {display}
    </strong>
  );
}
