import { useEffect, useRef, useState } from 'react';

export function numericPresentation(text: string) {
  const match = /\d[\d.]*(?:,\d+)?/.exec(text);
  if (!match) return null;
  const value = Number(match[0].replaceAll('.', '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const decimals = match[0].includes(',') ? match[0].split(',')[1].length : 0;
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + match[0].length);
  const formatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return { value, format: (current: number) => `${prefix}${formatter.format(current)}${suffix}` };
}

export function AnimatedValue({ text }: { text: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const [display, setDisplay] = useState(() => {
    const presentation = numericPresentation(text);
    return presentation && !(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      ? presentation.format(0)
      : text;
  });

  useEffect(() => {
    const presentation = numericPresentation(text);
    if (!presentation) {
      setDisplay(text);
      current.current = 0;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(text);
      current.current = presentation.value;
      return;
    }

    let frame = 0;
    let observer: IntersectionObserver | null = null;
    const animate = () => {
      const from = current.current;
      const to = presentation.value;
      if (from === to) {
        setDisplay(text);
        return;
      }
      const started = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - started) / 950);
        const eased = 1 - Math.pow(1 - progress, 3);
        current.current = from + (to - from) * eased;
        setDisplay(progress === 1 ? text : presentation.format(current.current));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window && element.current) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer?.disconnect();
          animate();
        }
      }, { threshold: 0.15 });
      observer.observe(element.current);
    } else animate();

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text]);

  return <span className="animated-value" ref={element}><span className="sr-only">{text}</span><span aria-hidden="true">{display}</span></span>;
}
