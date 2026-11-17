import React, { useEffect, useRef } from 'react';

/**
 * Lightweight, formal scientific molecular lattice background.
 * Optimized for low CPU/GPU overhead, crisp visual clarity, and fast initial load.
 */
export default function ScienceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    let isPaused = false;

    interface ScienceNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      isHighlight: boolean;
    }

    let nodes: ScienceNode[] = [];
    const mouse = { x: -1000, y: -1000, active: false };

    function createNodes() {
      nodes = [];
      const count = Math.min(34, Math.max(16, Math.floor((W * H) / 48000)));
      for (let i = 0; i < count; i++) {
        const isHighlight = i % 5 === 0;
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: isHighlight ? 2.1 : 1.35,
          isHighlight,
        });
      }
    }

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      W = window.innerWidth;
      H = window.innerHeight;

      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createNodes();
    }

    const CONNECTION_DIST = 140;
    const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
    const MOUSE_DIST = 150;
    const MOUSE_DIST_SQ = MOUSE_DIST * MOUSE_DIST;

    function draw() {
      if (!ctx || isPaused) return;

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0) {
          a.x = 0;
          a.vx = Math.abs(a.vx);
        } else if (a.x > W) {
          a.x = W;
          a.vx = -Math.abs(a.vx);
        }

        if (a.y < 0) {
          a.y = 0;
          a.vy = Math.abs(a.vy);
        } else if (a.y > H) {
          a.y = H;
          a.vy = -Math.abs(a.vy);
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECTION_DIST_SQ) {
            const ratio = 1 - Math.sqrt(distSq) / CONNECTION_DIST;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            if (a.isHighlight || b.isHighlight) {
              ctx.strokeStyle = `rgba(16, 185, 129, ${(ratio * 0.16).toFixed(3)})`;
              ctx.lineWidth = 0.75;
            } else {
              ctx.strokeStyle = `rgba(148, 163, 184, ${(ratio * 0.13).toFixed(3)})`;
              ctx.lineWidth = 0.55;
            }
            ctx.stroke();
          }
        }

        if (mouse.active) {
          const mdx = a.x - mouse.x;
          const mdy = a.y - mouse.y;
          const mdistSq = mdx * mdx + mdy * mdy;
          if (mdistSq < MOUSE_DIST_SQ) {
            const malpha = (1 - Math.sqrt(mdistSq) / MOUSE_DIST) * 0.25;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${malpha.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = a.isHighlight ? 'rgba(16, 185, 129, 0.55)' : 'rgba(148, 163, 184, 0.38)';
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animId);
      } else {
        isPaused = false;
        animId = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resize();
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      id="scienceCanvas"
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: '#f8fafc',
        pointerEvents: 'none',
      }}
    />
  );
}
