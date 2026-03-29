"use client";

import { useEffect, useRef, useCallback } from "react";

/* ─── Types ─── */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  isTeam: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

/* ─── Constants ─── */

const TEAL = [81, 236, 220] as const; // #51ecdc
const CONNECTION_DIST = 120;
const MAX_CONNECTIONS = 3;
const SPARK_INTERVAL = 3500;
const PULSE_INTERVAL = 7000;
const MOUSE_RADIUS = 150;

/* ─── Component ─── */

export function HeroSparkAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<Node[]>([]);
  const sparks = useRef<SparkParticle[]>([]);
  const pulses = useRef<PulseWave[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const lastSpark = useRef(0);
  const lastPulse = useRef(0);
  const isMobile = useRef(true);
  const isSmall = useRef(false);
  const mounted = useRef(true);

  const initNodes = useCallback((w: number, h: number) => {
    const count = isSmall.current ? 10 : isMobile.current ? 15 : 35;
    nodes.current = Array.from({ length: count }, () => {
      const team = Math.random() < 0.2;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: team ? 6 + Math.random() * 2 : 3 + Math.random() * 2,
        opacity: team ? 0.2 : 0.3 + Math.random() * 0.2,
        isTeam: team,
      };
    });
    sparks.current = [];
    pulses.current = [];
  }, []);

  useEffect(() => {
    // Save-data check
    if (
      (navigator as unknown as { connection?: { saveData?: boolean } })
        .connection?.saveData
    )
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    mounted.current = true;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      isMobile.current = rect.width < 768;
      isSmall.current = rect.width < 480;
      initNodes(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => {
      mouse.current = { x: -9999, y: -9999 };
    };
    canvas.parentElement?.addEventListener("mousemove", onMove);
    canvas.parentElement?.addEventListener("mouseleave", onLeave);

    /* ─── Helpers ─── */

    function emitSpark(x: number, y: number) {
      const count = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.5;
        sparks.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 0.8 + Math.random() * 0.4,
        });
      }
    }

    function emitPulse(x: number, y: number) {
      pulses.current.push({
        x,
        y,
        radius: 0,
        maxRadius: 200,
        life: 1,
        maxLife: 2,
      });
    }

    /* ─── Connection cache per frame ─── */

    function getConnections(pts: Node[]) {
      const conns: [number, number, number][] = [];
      const counts = new Uint8Array(pts.length);
      for (let i = 0; i < pts.length; i++) {
        if (counts[i] >= MAX_CONNECTIONS) continue;
        for (let j = i + 1; j < pts.length; j++) {
          if (counts[j] >= MAX_CONNECTIONS) continue;
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DIST) {
            conns.push([i, j, d]);
            counts[i]++;
            counts[j]++;
          }
        }
      }
      return conns;
    }

    /* ─── Draw loop ─── */

    function draw(now: number) {
      if (!mounted.current || !ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const dt = 1 / 60; // normalised
      ctx.clearRect(0, 0, w, h);

      const pts = nodes.current;
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const mobile = isMobile.current;

      /* Update nodes */
      for (const n of pts) {
        // Mouse attraction
        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * 0.15;
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        }

        // Dampen
        n.vx *= 0.995;
        n.vy *= 0.995;

        // Clamp
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 0.3) {
          n.vx = (n.vx / speed) * 0.3;
          n.vy = (n.vy / speed) * 0.3;
        }

        n.x += n.vx;
        n.y += n.vy;

        // Bounce edges
        if (n.x < 0) { n.x = 0; n.vx *= -0.5; }
        if (n.x > w) { n.x = w; n.vx *= -0.5; }
        if (n.y < 0) { n.y = 0; n.vy *= -0.5; }
        if (n.y > h) { n.y = h; n.vy *= -0.5; }
      }

      /* Connections */
      const conns = getConnections(pts);

      for (const [i, j, d] of conns) {
        const alpha = 0.15 * (1 - d / CONNECTION_DIST);
        ctx.strokeStyle = `rgba(${TEAL[0]},${TEAL[1]},${TEAL[2]},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }

      /* Nodes */
      for (const n of pts) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${TEAL[0]},${TEAL[1]},${TEAL[2]},${n.opacity})`;
        ctx.fill();
      }

      /* Sparks (desktop only) */
      if (!mobile) {
        // Emit spark on interval
        if (now - lastSpark.current > SPARK_INTERVAL && conns.length > 0) {
          lastSpark.current = now;
          const [ci, cj] = conns[Math.floor(Math.random() * conns.length)];
          const midX = (pts[ci].x + pts[cj].x) / 2;
          const midY = (pts[ci].y + pts[cj].y) / 2;
          emitSpark(midX, midY);
        }

        // Update & draw sparks
        const live: SparkParticle[] = [];
        for (const s of sparks.current) {
          s.life -= dt / s.maxLife;
          if (s.life <= 0) continue;
          s.vx *= 0.96;
          s.vy *= 0.96;
          s.x += s.vx;
          s.y += s.vy;
          live.push(s);

          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${TEAL[0]},${TEAL[1]},${TEAL[2]},${s.life * 0.8})`;
          ctx.fill();
        }
        sparks.current = live;

        /* Pulse waves (desktop only) */
        if (now - lastPulse.current > PULSE_INTERVAL && pts.length > 0) {
          lastPulse.current = now;
          const n = pts[Math.floor(Math.random() * pts.length)];
          emitPulse(n.x, n.y);
        }

        const livePulses: PulseWave[] = [];
        for (const p of pulses.current) {
          p.life -= dt / p.maxLife;
          if (p.life <= 0) continue;
          p.radius += (p.maxRadius / p.maxLife) * dt;
          livePulses.push(p);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${TEAL[0]},${TEAL[1]},${TEAL[2]},${p.life * 0.1})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        pulses.current = livePulses;
      }

      raf.current = requestAnimationFrame(draw);
    }

    raf.current = requestAnimationFrame(draw);

    return () => {
      mounted.current = false;
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      canvas.parentElement?.removeEventListener("mousemove", onMove);
      canvas.parentElement?.removeEventListener("mouseleave", onLeave);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    />
  );
}
