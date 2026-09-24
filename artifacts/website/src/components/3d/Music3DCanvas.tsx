import React, { useEffect, useRef } from 'react';

export type Music3DMode = 'visualizer' | 'vinyl' | 'sound-orb' | 'equalizer-tunnel' | 'particle-starfield';

interface Music3DCanvasProps {
  mode?: Music3DMode;
  isPlaying?: boolean;
  className?: string;
  speed?: number;
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

/**
 * Premium Liquid Audio Waves & Spectrum Visualizer
 * Reacts dynamically to playback state with 60FPS fluid canvas graphics,
 * ambient beat pulses, neon spectrum analyzer bars, and glowing aura particles.
 */
export const Music3DCanvas = React.memo(function Music3DCanvas({
  isPlaying = true,
  className = '',
  speed = 1.0,
}: Music3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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

    // Floating audio aura particles
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
    // Spectrum bar smoothed heights for fluid bounce
    const barCount = 52;
    const barHeights: number[] = new Array(barCount).fill(8);

    const render = () => {
      if (!ctx || !canvas) return;

      time += 0.02 * (isPlaying ? speed : 0.3);

      // Smooth mouse damping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2 + mouseRef.current.x * 30;
      const centerY = height / 2 + mouseRef.current.y * 30;

      // 1. Ambient Beat Glow Pulse in center
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

      // 2. Flowing Fluid Soundwave Ribbons
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

        // Glowing wave crest line
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

      // 3. Audio Frequency Spectrum Bars (at bottom)
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

        // Smooth height transition
        barHeights[i] += (targetH - barHeights[i]) * 0.22;
        const currentH = barHeights[i];
        const barX = startX + i * (barWidth + barGap);
        const barY = spectrumBaseY - currentH;

        // Gradient for each bar
        const colGrad = ctx.createLinearGradient(barX, spectrumBaseY, barX, barY);
        colGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        colGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
        colGrad.addColorStop(0.85, 'rgba(168, 85, 247, 0.8)');
        colGrad.addColorStop(1, 'rgba(236, 72, 153, 0.95)');

        ctx.fillStyle = colGrad;
        // Rounded bar top
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

        // Glowing cap dot when playing
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

      // 4. Floating Audio Sparks / Ambient Stardust
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
  }, [isPlaying, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
});
