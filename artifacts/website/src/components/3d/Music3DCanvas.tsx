import React, { useEffect, useRef } from 'react';

export type Music3DMode = 'visualizer' | 'nebula';

interface Music3DCanvasProps {
  mode?: Music3DMode;
  isPlaying?: boolean;
  className?: string;
  speed?: number;
  /** Degrees to rotate the nebula palette by — lets the room mood follow the track. */
  hueShift?: number;
}

interface VisualizerParticle {
  x: number;
  y: number;
  baseX: number;
  size: number;
  color: string;
  speedY: number;
  swaySpeed: number;
  swayOffset: number;
  alpha: number;
}

interface NebulaStar {
  x: number;
  y: number;
  r: number;
  phase: number;
  tw: number;
  depth: number;
}

interface NebulaOrb {
  bx: number;
  by: number;
  r: number;
  hue: number;
  phase: number;
  dx: number;
  dy: number;
  sp: number;
}

/**
 * Premium animated music background canvas.
 * - 'visualizer': liquid audio waves + neon spectrum bars + aura sparks.
 * - 'nebula': flowing aurora ribbons + additive glow orbs + twinkling starfield.
 * Both react to playback state and mouse parallax at 60FPS.
 */
export const Music3DCanvas = React.memo(function Music3DCanvas({
  mode = 'visualizer',
  isPlaying = true,
  className = '',
  speed = 1.0,
  hueShift = 0,
}: Music3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const hueShiftRef = useRef(hueShift);

  useEffect(() => {
    hueShiftRef.current = hueShift;
  }, [hueShift]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    let lastMouse = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMouse < 25) return;
      lastMouse = now;
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    /* ════════════════════════════════════════════════════
       NEBULA — aurora ribbons, glow orbs, starfield
       ════════════════════════════════════════════════════ */
    if (mode === 'nebula') {
      const stars: NebulaStar[] = Array.from({ length: isMobile ? 40 : 90 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
        tw: Math.random() * 0.9 + 0.35,
        depth: Math.random() * 0.7 + 0.3,
      }));

      const orbHues = [186, 200, 217, 262, 300, 330, 190];
      const orbs: NebulaOrb[] = Array.from({ length: isMobile ? 3 : 6 }, (_, i) => ({
        bx: 0.12 + Math.random() * 0.76,
        by: 0.18 + Math.random() * 0.64,
        r: (isMobile ? 50 : 70) + Math.random() * (isMobile ? 70 : 130),
        hue: orbHues[i % orbHues.length],
        phase: Math.random() * Math.PI * 2,
        dx: 30 + Math.random() * 55,
        dy: 18 + Math.random() * 40,
        sp: 0.12 + Math.random() * 0.14,
      }));

      const ribbonHues = [186, 208, 258, 318];
      let time = 0;
      let liveShift = hueShiftRef.current;

      const renderNebula = () => {
        if (!ctx || !canvas) return;

        time += 0.014 * speed * (isPlaying ? 1 : 0.45);
        liveShift += (hueShiftRef.current - liveShift) * 0.02;

        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        ctx.clearRect(0, 0, width, height);

        // 1. Flowing aurora ribbons
        for (let w = 0; w < 4; w++) {
          const hue = ribbonHues[w] + liveShift;
          const baseY =
            height * (0.26 + w * 0.17) + my * 16 * (0.5 + w * 0.3);
          const amp = (isPlaying ? 46 : 26) + w * 12;

          ctx.beginPath();
          for (let x = 0; x <= width; x += 12) {
            const y =
              baseY +
              Math.sin(x * 0.0021 + time * (0.9 + w * 0.22) + w * 1.7) * amp +
              Math.sin(x * 0.0047 - time * 0.6 + w) * amp * 0.35;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          const grad = ctx.createLinearGradient(0, 0, width, 0);
          grad.addColorStop(0, `hsla(${hue}, 90%, 60%, 0)`);
          grad.addColorStop(0.25, `hsla(${hue}, 90%, 62%, 0.1)`);
          grad.addColorStop(0.5, `hsla(${hue + 22}, 92%, 66%, 0.17)`);
          grad.addColorStop(0.75, `hsla(${hue}, 90%, 62%, 0.1)`);
          grad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 24 + w * 16;
          ctx.lineCap = 'round';
          ctx.filter = 'blur(2px)';
          ctx.stroke();
          ctx.filter = 'none';
        }

        // 2. Drifting additive glow orbs
        ctx.globalCompositeOperation = 'lighter';
        for (const o of orbs) {
          const ox = o.bx * width + Math.sin(time * o.sp + o.phase) * o.dx + mx * 22;
          const oy = o.by * height + Math.cos(time * o.sp * 0.8 + o.phase) * o.dy + my * 15;
          const oh = o.hue + liveShift;
          const pulse = isPlaying
            ? 0.72 + Math.sin(time * 1.6 + o.phase) * 0.28
            : 0.5;

          const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r);
          g.addColorStop(0, `hsla(${oh}, 95%, 66%, ${0.15 * pulse})`);
          g.addColorStop(0.5, `hsla(${oh}, 90%, 58%, ${0.06 * pulse})`);
          g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ox, oy, o.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // 3. Twinkling parallax starfield
        for (const s of stars) {
          const tw =
            (Math.sin(time * s.tw * 2 + s.phase) * 0.5 + 0.5) *
            (isPlaying ? 1 : 0.45);
          ctx.globalAlpha = 0.1 + tw * 0.5;
          ctx.fillStyle = '#e0faff';
          const sx = s.x * width + mx * 26 * s.depth;
          const sy = s.y * height + my * 18 * s.depth;
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        animId = requestAnimationFrame(renderNebula);
      };

      animId = requestAnimationFrame(renderNebula);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }

    /* ════════════════════════════════════════════════════
       VISUALIZER — liquid waves, spectrum bars, sparks
       ════════════════════════════════════════════════════ */
    const particleColors = ['#00f5d4', '#00b4d8', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
    const particleCount = 42;
    const particles: VisualizerParticle[] = Array.from({ length: particleCount }, () => {
      const x = Math.random() * (width || window.innerWidth);
      return {
        x,
        baseX: x,
        y: Math.random() * (height || window.innerHeight),
        size: Math.random() * 2.2 + 1.2,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        speedY: Math.random() * 0.6 + 0.3,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayOffset: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.45 + 0.25,
      };
    });

    let time = 0;
    const barCount = 52;
    const barHeights: number[] = new Array(barCount).fill(8);

    const render = () => {
      if (!ctx || !canvas) return;

      time += 0.02 * (isPlaying ? speed : 0.3);

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2 + mouseRef.current.x * 30;
      const centerY = height / 2 + mouseRef.current.y * 30;

      const beatPulse = isPlaying ? Math.sin(time * 3.5) * 0.25 + 0.85 : 0.4;
      const radialGrad = ctx.createRadialGradient(
        centerX,
        centerY * 0.9,
        15,
        centerX,
        centerY * 0.9,
        Math.min(width, height) * 0.55
      );
      radialGrad.addColorStop(0, `rgba(6, 182, 212, ${0.12 * beatPulse})`);
      radialGrad.addColorStop(0.35, `rgba(59, 130, 246, ${0.08 * beatPulse})`);
      radialGrad.addColorStop(0.7, `rgba(168, 85, 247, ${0.04 * beatPulse})`);
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      const waveCount = 3;
      const waveBaseY = height * 0.82 + mouseRef.current.y * 15;

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const waveOffset = w * 1.8;
        const waveAmp = (isPlaying ? 32 : 8) + w * 10;
        const waveFreq = 0.0035 - w * 0.0008;
        const waveSpeed = time * (1.2 + w * 0.35);

        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 14) {
          const y =
            waveBaseY +
            Math.sin(x * waveFreq + waveSpeed + waveOffset) * waveAmp * Math.sin(time * 2 + w) +
            Math.cos(x * waveFreq * 1.4 - waveSpeed * 0.7) * (waveAmp * 0.45);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, waveBaseY - 60, width, height);
        if (w === 0) {
          waveGrad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
          waveGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.07)');
          waveGrad.addColorStop(1, 'rgba(139, 92, 246, 0.02)');
        } else if (w === 1) {
          waveGrad.addColorStop(0, 'rgba(168, 85, 247, 0.1)');
          waveGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.05)');
          waveGrad.addColorStop(1, 'rgba(59, 130, 246, 0.015)');
        } else {
          waveGrad.addColorStop(0, 'rgba(0, 245, 212, 0.09)');
          waveGrad.addColorStop(1, 'rgba(30, 58, 138, 0.02)');
        }

        ctx.fillStyle = waveGrad;
        ctx.fill();

        ctx.beginPath();
        for (let x = 0; x <= width; x += 14) {
          const y =
            waveBaseY +
            Math.sin(x * waveFreq + waveSpeed + waveOffset) * waveAmp * Math.sin(time * 2 + w) +
            Math.cos(x * waveFreq * 1.4 - waveSpeed * 0.7) * (waveAmp * 0.45);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          w === 0
            ? 'rgba(6, 182, 212, 0.4)'
            : w === 1
              ? 'rgba(168, 85, 247, 0.3)'
              : 'rgba(0, 245, 212, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const barTotalWidth = width * 0.94;
      const startX = (width - barTotalWidth) / 2;
      const barGap = 4;
      const barWidth = Math.max(3, (barTotalWidth - barGap * barCount) / barCount);
      const spectrumBaseY = height - 8;

      for (let i = 0; i < barCount; i++) {
        const normIndex = i / barCount;
        const distFromCenter = Math.abs(normIndex - 0.5) * 2;
        const bellCurve = Math.cos(distFromCenter * Math.PI * 0.5);

        let targetH = 8;
        if (isPlaying) {
          const f1 = Math.sin(time * 4.2 + i * 0.32);
          const f2 = Math.cos(time * 2.6 - i * 0.22);
          const f3 = Math.sin(time * 5.8 + i * 0.65);
          const rawH = (f1 * 0.45 + f2 * 0.35 + f3 * 0.2 + 1) * 0.5;
          targetH = rawH * (height * 0.25) * (0.35 + bellCurve * 0.65) + 10;
        } else {
          targetH = (Math.sin(time * 1.5 + i * 0.2) * 0.5 + 0.5) * 8 + 6;
        }

        barHeights[i] += (targetH - barHeights[i]) * 0.22;
        const currentH = barHeights[i];
        const barX = startX + i * (barWidth + barGap);
        const barY = spectrumBaseY - currentH;

        const colGrad = ctx.createLinearGradient(barX, spectrumBaseY, barX, barY);
        colGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        colGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
        colGrad.addColorStop(0.85, 'rgba(168, 85, 247, 0.8)');
        colGrad.addColorStop(1, 'rgba(236, 72, 153, 0.95)');

        ctx.fillStyle = colGrad;
        const radius = Math.min(barWidth / 2, 3);
        ctx.beginPath();
        ctx.moveTo(barX + radius, barY);
        ctx.lineTo(barX + barWidth - radius, barY);
        ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
        ctx.lineTo(barX + barWidth, spectrumBaseY);
        ctx.lineTo(barX, spectrumBaseY);
        ctx.lineTo(barX, barY + radius);
        ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
        ctx.closePath();
        ctx.fill();

        if (isPlaying && currentH > 20) {
          ctx.beginPath();
          ctx.arc(barX + barWidth / 2, barY - 2, radius * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = '#67e8f9';
          ctx.shadowColor = '#00f5d4';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isPlaying) {
          p.y -= p.speedY * (1.2 * speed);
          p.x = p.baseX + Math.sin(time + p.swayOffset) * 20;
        } else {
          p.y -= p.speedY * 0.3;
          p.x = p.baseX + Math.sin(time * 0.5 + p.swayOffset) * 8;
        }

        if (p.y < -10) {
          p.y = height + 10;
          p.x = p.baseX = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (isPlaying ? 1.0 : 0.45);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isPlaying ? 10 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPlaying, speed, mode]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
});
