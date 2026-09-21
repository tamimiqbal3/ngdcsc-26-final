import React, { useEffect, useRef } from 'react';

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
    let dpr = 1;
    let time = 0;

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
    }

    function glow(x: number, y: number, radius: number, color: string) {
      if (!ctx) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      /* Soft moving scientific energy fields */
      const x1 = W * 0.20 + Math.sin(time * 0.45) * W * 0.15;
      const y1 = H * 0.28 + Math.cos(time * 0.35) * H * 0.18;

      const x2 = W * 0.80 + Math.cos(time * 0.30) * W * 0.16;
      const y2 = H * 0.68 + Math.sin(time * 0.40) * H * 0.20;

      const x3 = W * 0.50 + Math.sin(time * 0.25) * W * 0.10;
      const y3 = H * 0.50 + Math.cos(time * 0.28) * H * 0.12;

      // Glow fields
      glow(x1, y1, Math.min(W, H) * 0.60, 'rgba(59, 130, 246, 0.18)');
      glow(x2, y2, Math.min(W, H) * 0.65, 'rgba(16, 185, 129, 0.16)');
      glow(x3, y3, Math.min(W, H) * 0.45, 'rgba(6, 182, 212, 0.12)');

      /* Flowing sine wave scientific field (7 vibrant layers) */
      for (let layer = 0; layer < 7; layer++) {
        ctx.beginPath();

        for (let x = -50; x <= W + 50; x += 6) {
          const normalized = x / W;

          const y =
            H * (0.45 + layer * 0.04) +
            Math.sin(normalized * 6.5 + time * 0.65 + layer * 0.7) * (30 + layer * 6) +
            Math.sin(normalized * 14 - time * 0.35) * 12;

          if (x === -50) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Distinct scientific gradient coloring
        const opacity = 0.07 + layer * 0.025;
        ctx.strokeStyle = layer % 2 === 0 
          ? `rgba(37, 99, 235, ${opacity})` 
          : `rgba(16, 185, 129, ${opacity * 1.1})`;

        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      /* Floating scientific particles with glow */
      for (let i = 0; i < 42; i++) {
        const px = (i * 157 + time * (16 + (i % 5) * 3)) % (W + 120) - 60;
        const py = H * 0.5 + Math.sin(i * 1.6 + time * 0.45) * H * 0.36;
        const radius = 1.6 + (i % 3) * 0.8;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(37, 99, 235, 0.40)' : 'rgba(0, 229, 153, 0.45)';
        ctx.fill();

        // Subtle glow around some particles
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.arc(px, py, radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
          ctx.fill();
        }
      }

      time += 0.009;
      animId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="science-bg fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#F6F9FD]">
      <canvas id="scienceField" ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
