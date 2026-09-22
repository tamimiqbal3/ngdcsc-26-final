import React, { useEffect, useRef } from 'react';

/**
 * Formal, uniform scientific particle & molecular lattice network animation
 * Runs smoothly and consistently across all pages of the NGDC Science Club portal.
 */
export default function ScienceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    interface ScienceNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      baseAlpha: number;
      isHighlight: boolean;
      pulseOffset: number;
    }

    let nodes: ScienceNode[] = [];
    const mouse = { x: -1000, y: -1000, active: false };

    function createNodes() {
      nodes = [];
      // Adjust density based on screen dimensions for optimal performance
      const count = Math.min(75, Math.max(35, Math.floor((W * H) / 18000)));

      for (let i = 0; i < count; i++) {
        const isHighlight = i % 5 === 0;
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          // Formal, dignified, steady velocity (smooth, not chaotic)
          vx: (Math.random() - 0.5) * 0.32,
          vy: (Math.random() - 0.5) * 0.32,
          r: isHighlight ? Math.random() * 0.8 + 2.0 : Math.random() * 0.7 + 1.2,
          baseAlpha: isHighlight ? 0.85 : 0.45,
          isHighlight,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createNodes();
    }

    function draw() {
      if (!ctx) return;

      // Dark canvas refresh with slight trail fade for fluid motion
      ctx.fillStyle = 'rgba(5, 7, 10, 0.25)';
      ctx.fillRect(0, 0, W, H);

      const time = performance.now() * 0.0015;
      const connectionDist = 145;
      const mouseConnectionDist = 160;

      // 1. Draw connections between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];

        // Update position
        a.x += a.vx;
        a.y += a.vy;

        // Formal boundary bounce
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

        // Draw node-to-node links
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.16;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            // Emerald-tinted subtle connection
            if (a.isHighlight || b.isHighlight) {
              ctx.strokeStyle = `rgba(0, 229, 153, ${alpha * 1.3})`;
              ctx.lineWidth = 0.8;
            } else {
              ctx.strokeStyle = `rgba(180, 210, 235, ${alpha})`;
              ctx.lineWidth = 0.55;
            }
            ctx.stroke();
          }
        }

        // 2. Gentle connection to mouse cursor when active
        if (mouse.active) {
          const mdx = a.x - mouse.x;
          const mdy = a.y - mouse.y;
          const mdist = Math.hypot(mdx, mdy);

          if (mdist < mouseConnectionDist) {
            const malpha = (1 - mdist / mouseConnectionDist) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0, 229, 153, ${malpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        // 3. Render Node Point
        const pulse = Math.sin(time + a.pulseOffset) * 0.25;
        const currentRadius = Math.max(0.8, a.r + pulse * 0.5);

        ctx.beginPath();
        ctx.arc(a.x, a.y, currentRadius, 0, Math.PI * 2);

        if (a.isHighlight) {
          // Emerald highlight with soft glow
          ctx.fillStyle = `rgba(0, 229, 153, ${a.baseAlpha + pulse * 0.15})`;
          ctx.shadowColor = 'rgba(0, 229, 153, 0.4)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Cool white/silver point
          ctx.fillStyle = `rgba(215, 230, 245, ${a.baseAlpha + pulse * 0.1})`;
          ctx.fill();
        }
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

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    resize();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <style>{`
        #scienceCanvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          background: #05070a;
          pointer-events: none;
        }
      `}</style>
      <canvas id="scienceCanvas" ref={canvasRef} />
    </>
  );
}
