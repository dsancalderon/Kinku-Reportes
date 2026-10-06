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

export function SpaceBackground() {
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
      stars = Array.from({ length: Math.min(420, Math.max(120, Math.round(width * height / 4200))) }, () => {
        const bright = Math.random() < 0.12;
        return {
          x: random(0, width),
          y: random(0, height),
          radius: bright ? random(1.1, 1.8) : random(0.35, 1.05),
          base: bright ? random(0.5, 0.7) : random(0.18, 0.42),
          pulse: bright ? random(0.25, 0.45) : random(0.1, 0.38),
          phase: random(0, Math.PI * 2),
          speed: random(0.8, 2.6),
          bright,
        };
      });
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


      for (const star of stars) {
        const shimmer = (1 + Math.sin(now * 0.001 * star.speed + star.phase)) / 2;
        const alpha = star.base + star.pulse * shimmer;
        if (star.bright) {
          const halo = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 5);
          halo.addColorStop(0, `rgba(255,255,255,${alpha * 0.3})`);
          halo.addColorStop(1, 'rgba(255,255,255,0)');
          context.fillStyle = halo;
          context.beginPath();
          context.arc(star.x, star.y, star.radius * 5, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = `rgba(255,255,255,${Math.min(1, alpha)})`;
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
          streak.addColorStop(0, 'rgba(255,255,255,0)');
          streak.addColorStop(0.75, `rgba(255,255,255,${alpha * 0.32})`);
          streak.addColorStop(1, `rgba(255,255,255,${alpha})`);
          context.strokeStyle = streak;
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(x, y);
          context.stroke();

          const head = context.createRadialGradient(x, y, 0, x, y, 6);
          head.addColorStop(0, `rgba(255,255,255,${alpha})`);
          head.addColorStop(1, 'rgba(255,255,255,0)');
          context.fillStyle = head;
          context.beginPath();
          context.arc(x, y, 6, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    function tick(now: number) {
      if (document.hidden) return;
      frame = window.requestAnimationFrame(tick);
      if (now - lastFrame < 32) return;
      lastFrame = now;
      if (!meteor && now >= nextMeteorAt) spawnMeteor(now);
      draw(now);
    }

    function syncMotion() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (document.hidden) {
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
  }, []);

  return <canvas ref={canvasRef} className="space-background" aria-hidden="true" />;
}
