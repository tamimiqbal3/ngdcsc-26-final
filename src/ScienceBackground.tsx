import React, { useEffect, useRef } from 'react';

export default function ScienceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W: number, H: number, dpr: number;
    let scene = 0;
    let nodes: Array<{ x: number; y: number; r: number; vx: number; vy: number }> = [];
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];

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
      createParticles();
    }

    // Clean background without any grid or grip lines
    function background() {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(5,7,10,.16)';
      ctx.fillRect(0, 0, W, H);
    }

    function createNodes() {
      nodes = [];
      const count = Math.min(65, Math.floor((W * H) / 19000));
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.8 + 0.8,
          // Significantly faster nodes (speed increased from 0.08 to 0.45)
          vx: (Math.random() - 0.5) * 0.48,
          vy: (Math.random() - 0.5) * 0.48
        });
      }
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < 180; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          // Faster floating particles (speed increased from 0.25 to 0.95)
          vx: (Math.random() - 0.5) * 0.95,
          vy: (Math.random() - 0.5) * 0.95,
          r: Math.random() * 1.4 + 0.4
        });
      }
    }

    function blueprint() {
      if (!ctx) return;
      background();

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];

        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);

          if (d < 155) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(170,190,210,${(1 - d / 155) * 0.22})`;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,230,240,.75)';
        ctx.fill();
      }
    }

    function circuit() {
      if (!ctx) return;
      background();

      const grid = 80;
      ctx.lineWidth = 0.8;

      for (let x = grid / 2; x < W; x += grid) {
        for (let y = grid / 2; y < H; y += grid) {
          if (Math.random() > 0.45) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            if (Math.random() > 0.5) {
              ctx.lineTo(x + grid, y);
            } else {
              ctx.lineTo(x, y + grid);
            }
            ctx.strokeStyle = 'rgba(170,190,210,.15)';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(220,230,240,.6)';
            ctx.fill();
          }
        }
      }

      // High-speed electron pulses (speed increased from 0.025 to 0.10)
      for (let i = 0; i < 9; i++) {
        const x = ((performance.now() * 0.10 + i * 180) % (W + 300)) - 150;
        const y = H * 0.22 + i * H * 0.09;

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'white';
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function reaction() {
      if (!ctx) return;
      background();

      const cx = W / 2;
      const cy = H / 2;

      particles.forEach((p) => {
        const dx = cx - p.x;
        const dy = cy - p.y;
        const d = Math.hypot(dx, dy);

        // Faster centripetal acceleration (increased from 0.002 to 0.008)
        if (d < 320) {
          p.vx += (dx / d) * 0.008;
          p.vy += (dy / d) * 0.008;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,230,235,.65)';
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(210,220,230,.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(230,235,240,.38)';
      ctx.stroke();
    }

    function future() {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(3,5,8,.2)';
      ctx.fillRect(0, 0, W, H);

      // Accelerated time flow (increased from 0.001 to 0.0028)
      const t = performance.now() * 0.0028;

      for (let i = 0; i < 6; i++) {
        const y = ((t * 70 + i * 170) % (H + 120)) - 60;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.strokeStyle = 'rgba(210,220,230,.09)';
        ctx.stroke();
      }

      const cx = W / 2;
      const cy = H / 2;

      for (let i = 0; i < 4; i++) {
        const r = 55 + i * 42;
        ctx.beginPath();
        ctx.arc(cx, cy, r, t * 0.45 + i, t * 0.45 + i + Math.PI * 1.55);
        ctx.strokeStyle = 'rgba(220,230,240,.35)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      for (let i = 0; i < 45; i++) {
        const a = i * 0.71 + t * 0.4;
        const r = 130 + (i % 5) * 35;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.55;

        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,235,240,.75)';
        ctx.fill();
      }
    }

    function tap() {
      scene++;
      if (scene > 3) scene = 0;
      if (scene === 2) {
        createParticles();
      }
    }

    function animate() {
      if (scene === 0) blueprint();
      else if (scene === 1) circuit();
      else if (scene === 2) reaction();
      else if (scene === 3) future();

      animId = requestAnimationFrame(animate);
    }

    // Allow user to click anywhere on empty background space to switch scene smoothly
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest('button, input, textarea, select, a, [role="button"], label')) {
        return;
      }
      tap();
    };

    window.addEventListener('resize', resize);
    document.addEventListener('click', handleGlobalClick);

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('click', handleGlobalClick);
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
