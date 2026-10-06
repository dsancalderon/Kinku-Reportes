import { useEffect, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  radius: number;
  base: number;
  pulse: number;
  phase: number;
  speed: number;
  bright: boolean;
};

type Meteor = {
  x: number;
  y: number;
  distance: number;
  slope: number;
  duration: number;
  born: number;
  tail: number;
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function SpaceBackground({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteorAt = performance.now() + 1200;
    let frame = 0;
    let lastFrame = 0;

    function resize() {
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stars = Array.from({ length: Math.min(140, Math.max(55, Math.round(width * height / 9000))) }, () => ({
        x: random(0, width),
        y: random(0, height),
        radius: random(0.65, 1.5),
        base: random(0.1, 0.24),
        pulse: random(0.25, 0.52),
        phase: random(0, Math.PI * 2),
        speed: random(1.3, 3.2),
        bright: Math.random() < 0.22,
      }));
      draw(0);
    }

    function spawnMeteor(now: number) {
      meteor = {
        x: random(width * 0.35, width * 0.7),
        y: random(110, Math.min(height * 0.3, 200)),
        distance: random(150, Math.min(width * 0.32, 310)),
        slope: random(-0.18, 0.12),
        duration: random(1400, 2000),
        born: now,
        tail: random(95, 145),
      };
      nextMeteorAt = now + random(7000, 11000);
    }

    function draw(now: number) {
      if (!context || width <= 0 || height <= 0) return;
      context.clearRect(0, 0, width, height);

      // Luz difusa lenta sobre la textura original.
      for (const [index, color] of ['90,112,157', '111,93,139'].entries()) {
        const centerX = width * (index ? 0.78 : 0.24) + Math.sin(now * 0.00008 + index) * 22;
        const centerY = height * (index ? 0.67 : 0.28) + Math.cos(now * 0.00006 + index) * 18;
        const radius = Math.max(width, height) * 0.42;
        const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        glow.addColorStop(0, `rgba(${color},0.035)`);
        glow.addColorStop(1, `rgba(${color},0)`);
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }

      for (const star of stars) {
        const shimmer = (1 + Math.sin(now * 0.001 * star.speed + star.phase)) / 2;
        const alpha = star.base + star.pulse * shimmer;
        if (star.bright) {
          const halo = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 5);
          halo.addColorStop(0, `rgba(235,243,255,${alpha * 0.36})`);
          halo.addColorStop(1, 'rgba(235,243,255,0)');
          context.fillStyle = halo;
          context.beginPath();
          context.arc(star.x, star.y, star.radius * 5, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = `rgba(224,234,255,${alpha})`;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      }

      if (meteor) {
        const progress = (now - meteor.born) / meteor.duration;
        if (progress >= 1) {
          meteor = null;
        } else if (progress >= 0) {
          const x = meteor.x + meteor.distance * progress;
          const y = meteor.y + meteor.distance * meteor.slope * progress;
          const trail = meteor.tail * Math.sin(Math.PI * progress);
          const alpha = 0.88 * Math.sin(Math.PI * progress);
          const tailX = x - trail;
          const tailY = y - trail * meteor.slope;
          const streak = context.createLinearGradient(tailX, tailY, x, y);
          streak.addColorStop(0, 'rgba(210,229,255,0)');
          streak.addColorStop(0.75, `rgba(206,226,255,${alpha * 0.32})`);
          streak.addColorStop(1, `rgba(247,251,255,${alpha})`);
          context.strokeStyle = streak;
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(x, y);
          context.stroke();

          const head = context.createRadialGradient(x, y, 0, x, y, 6);
          head.addColorStop(0, `rgba(255,255,255,${alpha})`);
          head.addColorStop(1, 'rgba(180,211,255,0)');
          context.fillStyle = head;
          context.beginPath();
          context.arc(x, y, 6, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    function tick(now: number) {
      if (document.hidden || !active) return;
      frame = window.requestAnimationFrame(tick);
      if (now - lastFrame < 32) return;
      lastFrame = now;
      if (!meteor && now >= nextMeteorAt) spawnMeteor(now);
      draw(now);
    }

    function syncMotion() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (document.hidden || !active) {
        meteor = null;
        draw(0);
      } else {
        lastFrame = 0;
        frame = window.requestAnimationFrame(tick);
      }
    }

    resize();
    syncMotion();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', syncMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', syncMotion);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="space-background" aria-hidden="true" />;
}
